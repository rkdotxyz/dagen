/*
  cloud.test.js — tests for the cloud helpers, with a FAKE database.

  None of this touches Supabase. The fake below records what it was
  asked to do and hands back whatever the test wants, which is enough to
  check the shapes we send and the way errors are handled.
*/

import { describe, expect, test, vi } from 'vitest'
import { fromPlanner, loadPlanner, savePlanner, toPlanner } from './cloud.js'
import { DEFAULT_SETTINGS, TASK_DEFAULTS, migrateArea } from './migrate.js'

// A complete planner as Phase 11 saves it. Its task and Area already
// have every field, so loading it back gives exactly the same thing.
const planner = {
  tasks: [
    {
      ...TASK_DEFAULTS,
      id: 't1',
      title: 'Laundry',
      categoryId: 'chores',
      start: '2026-10-05T14:00',
      day: '2026-10-05',
      durationMin: 90,
      tentative: false,
      status: 'todo',
    },
  ],
  templates: [{ id: 'c1', title: 'Cook dinner' }],
  skipped: ['c1:2026-10-05'],
  collapsed: ['social'],
  areas: [migrateArea({ id: 'a_rk', name: 'Räckvidd', categoryId: 'projects' })],
  entries: [],
  activeTimer: null,
  away: [],
  settings: DEFAULT_SETTINGS,
}

// A stand-in for Supabase's client. Its methods return itself so calls
// can be chained the same way, and it remembers the last upsert.
function fakeClient({ row = null, error = null } = {}) {
  const calls = []

  const client = {
    calls: calls,
    from: () => client,
    select: () => client,
    eq: () => client,
    maybeSingle: async () => ({ data: row, error: error }),
    upsert: async (value) => {
      calls.push(value)
      return { error: error }
    },
  }

  return client
}

describe('planner shape', () => {
  // Changed in Phase 11 (on purpose): five new fields travel too.
  test('keeps the planner fields and nothing else', () => {
    const extra = { ...planner, somethingElse: 'should not travel' }
    expect(Object.keys(toPlanner(extra)).sort()).toEqual([
      'activeTimer',
      'areas',
      'away',
      'collapsed',
      'entries',
      'settings',
      'skipped',
      'tasks',
      'templates',
    ])
  })

  // Changed in Phase 11 (on purpose): missing fields get their defaults,
  // not only empty lists.
  test('gives anything missing a safe default', () => {
    expect(fromPlanner(null)).toEqual({
      tasks: [],
      templates: [],
      skipped: [],
      collapsed: [],
      areas: [],
      entries: [],
      activeTimer: null,
      away: [],
      settings: DEFAULT_SETTINGS,
    })
  })

  test('a row saved before Phase 11 loads with nothing lost', () => {
    // Exactly what Phase 10 wrote: four lists, tasks without the new fields.
    const oldRow = {
      tasks: [
        {
          id: 't1',
          title: 'Laundry',
          categoryId: 'chores',
          start: '2026-10-05T14:00',
          durationMin: 90,
          tentative: false,
          status: 'done',
          templateId: 'c1',
        },
      ],
      templates: [{ id: 'c1', title: 'Laundry' }],
      skipped: ['c1:2026-10-04'],
      collapsed: ['social'],
    }

    const loaded = fromPlanner(oldRow)

    // Every old field is still there, untouched...
    expect(loaded.tasks[0]).toMatchObject(oldRow.tasks[0])
    // ...and the new ones have their defaults, with day read from start.
    expect(loaded.tasks[0]).toMatchObject({
      day: '2026-10-05',
      areaId: null,
      fixed: false,
      due: null,
      priority: false,
      rolled: 0,
      doneAt: null,
    })
    expect(loaded.templates).toEqual(oldRow.templates)
    expect(loaded.skipped).toEqual(oldRow.skipped)
    expect(loaded.collapsed).toEqual(oldRow.collapsed)
    expect(loaded.areas).toEqual([])
    expect(loaded.settings).toEqual(DEFAULT_SETTINGS)
  })

  test('an unplaced task in the cloud stays unplaced', () => {
    const row = { tasks: [{ id: 't2', title: 'CV', start: null, day: null }] }
    expect(fromPlanner(row).tasks[0]).toMatchObject({ start: null, day: null })
  })

  test('a damaged timer or settings value falls back to the default', () => {
    const loaded = fromPlanner({ activeTimer: 'oops', settings: { capacity: 'x' } })
    expect(loaded.activeTimer).toBeNull()
    expect(loaded.settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe('loadPlanner', () => {
  test('returns null when nothing is saved yet', async () => {
    expect(await loadPlanner(fakeClient(), 'user-1')).toBeNull()
  })

  test('returns the planner when a row exists', async () => {
    const client = fakeClient({ row: { data: planner } })
    expect(await loadPlanner(client, 'user-1')).toEqual(planner)
  })

  test('returns null and reports a failure instead of throwing', async () => {
    // vi.spyOn replaces console.error for this test, so the failure
    // doesn't clutter the output and we can check it was reported.
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeClient({ error: { message: 'offline' } })

    expect(await loadPlanner(client, 'user-1')).toBeNull()
    expect(reported).toHaveBeenCalled()

    reported.mockRestore()
  })
})

describe('savePlanner', () => {
  test('sends the planner with the user id', async () => {
    const client = fakeClient()
    expect(await savePlanner(client, 'user-1', planner)).toBe(true)

    expect(client.calls[0].user_id).toBe('user-1')
    expect(client.calls[0].data).toEqual(planner)
  })

  test('reports a failure instead of throwing', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeClient({ error: { message: 'offline' } })

    expect(await savePlanner(client, 'user-1', planner)).toBe(false)
    expect(reported).toHaveBeenCalled()

    reported.mockRestore()
  })
})
