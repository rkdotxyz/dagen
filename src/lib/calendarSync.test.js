import { describe, expect, test, vi } from 'vitest'
import {
  applyPlan,
  isEmptyPlan,
  planSync,
  signatureOf,
} from './calendarSync.js'

const laundry = {
  id: 't1',
  title: 'Laundry',
  categoryId: 'chores',
  start: '2026-10-05T14:00',
  durationMin: 90,
  tentative: false,
  status: 'todo',
}

// What the record looks like after Laundry has been sent once.
const sentLaundry = {
  t1: { eventId: 'event-1', signature: signatureOf(laundry) },
}

describe('signatureOf', () => {
  test('ignores changes Google never sees', () => {
    // Ticking a task off doesn't change the event, so it must not
    // trigger a pointless request.
    expect(signatureOf({ ...laundry, status: 'done' })).toBe(signatureOf(laundry))
  })

  test('notices every change Google does see', () => {
    const changes = [
      { title: 'Washing' },
      { start: '2026-10-05T15:00' },
      { durationMin: 60 },
      { tentative: true },
      { categoryId: 'personal' },
    ]

    for (const change of changes) {
      expect(signatureOf({ ...laundry, ...change })).not.toBe(signatureOf(laundry))
    }
  })
})

describe('planSync', () => {
  test('a new task is created', () => {
    const plan = planSync({}, [laundry])

    expect(plan.creates).toEqual([laundry])
    expect(plan.updates).toEqual([])
    expect(plan.deletes).toEqual([])
  })

  test('an unchanged task is left alone', () => {
    expect(isEmptyPlan(planSync(sentLaundry, [laundry]))).toBe(true)
  })

  test('a moved task is updated, with the event it belongs to', () => {
    const moved = { ...laundry, start: '2026-10-05T16:00' }
    const plan = planSync(sentLaundry, [moved])

    expect(plan.updates).toEqual([{ task: moved, eventId: 'event-1' }])
    expect(plan.creates).toEqual([])
  })

  test('ticking a task off needs no request', () => {
    const done = { ...laundry, status: 'done' }
    expect(isEmptyPlan(planSync(sentLaundry, [done]))).toBe(true)
  })

  test('a task that is gone has its event deleted', () => {
    const plan = planSync(sentLaundry, [])

    expect(plan.deletes).toEqual([{ taskId: 't1', eventId: 'event-1' }])
  })

  test('handles several tasks at once', () => {
    const dishes = { ...laundry, id: 't2', title: 'Dishes' }
    const plan = planSync(sentLaundry, [{ ...laundry, title: 'Washing' }, dishes])

    expect(plan.creates.map((task) => task.id)).toEqual(['t2'])
    expect(plan.updates.map((update) => update.task.id)).toEqual(['t1'])
    expect(plan.deletes).toEqual([])
  })
})

describe('applyPlan', () => {
  const getCategory = () => ({ googleColorId: '2' })

  function fakeApi(overrides = {}) {
    return {
      createEvent: vi.fn(async () => 'event-new'),
      updateEvent: vi.fn(async () => ({})),
      deleteEvent: vi.fn(async () => null),
      ...overrides,
    }
  }

  test('remembers the event id of a newly created task', async () => {
    const api = fakeApi()
    const plan = planSync({}, [laundry])

    const { sent, failures } = await applyPlan(api, plan, {}, getCategory)

    expect(api.createEvent).toHaveBeenCalledTimes(1)
    expect(sent.t1.eventId).toBe('event-new')
    expect(failures).toBe(0)
  })

  test('keeps the same event id when a task is updated', async () => {
    const api = fakeApi()
    const moved = { ...laundry, start: '2026-10-05T16:00' }

    const { sent } = await applyPlan(
      api,
      planSync(sentLaundry, [moved]),
      sentLaundry,
      getCategory,
    )

    expect(api.updateEvent).toHaveBeenCalledWith('event-1', moved, { googleColorId: '2' })
    expect(sent.t1.eventId).toBe('event-1')
    expect(sent.t1.signature).toBe(signatureOf(moved))
  })

  test('forgets a task whose event was deleted', async () => {
    const api = fakeApi()

    const { sent } = await applyPlan(api, planSync(sentLaundry, []), sentLaundry, getCategory)

    expect(api.deleteEvent).toHaveBeenCalledWith('event-1')
    expect(sent.t1).toBeUndefined()
  })

  test('a failure is counted, and the task is left to be retried', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const api = fakeApi({
      createEvent: async () => {
        throw new Error('403')
      },
    })

    const { sent, failures } = await applyPlan(api, planSync({}, [laundry]), {}, getCategory)

    expect(failures).toBe(1)
    // Nothing recorded, so the next run tries again.
    expect(sent.t1).toBeUndefined()
    reported.mockRestore()
  })

  test('one failure does not stop the rest of the plan', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dishes = { ...laundry, id: 't2', title: 'Dishes' }
    let first = true

    const api = fakeApi({
      createEvent: async () => {
        if (first) {
          first = false
          throw new Error('503')
        }
        return 'event-2'
      },
    })

    const { sent, failures } = await applyPlan(
      api,
      planSync({}, [laundry, dishes]),
      {},
      getCategory,
    )

    expect(failures).toBe(1)
    expect(sent.t2.eventId).toBe('event-2')
    reported.mockRestore()
  })
})
