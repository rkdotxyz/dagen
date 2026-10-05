import { describe, expect, test } from 'vitest'
import { isDue, missingTasks, skipKey } from './recurring.js'

const cook = {
  id: 'cook',
  title: 'Cook dinner',
  categoryId: 'meals',
  repeat: 'daily',
  time: '18:00',
  durationMin: 60,
}

const laundry = {
  id: 'laundry',
  title: 'Laundry',
  categoryId: 'chores',
  repeat: 'weekly',
  weekday: 5, // Saturday, counting Monday as 0
  time: '14:00',
  durationMin: 90,
}

// 2026-10-05 is a Monday, 2026-10-10 the Saturday of that week.
const monday = '2026-10-05'
const saturday = '2026-10-10'

describe('isDue', () => {
  test('a daily chore is due every day', () => {
    expect(isDue(cook, monday)).toBe(true)
    expect(isDue(cook, saturday)).toBe(true)
  })

  test('a weekly chore is due on its weekday only', () => {
    expect(isDue(laundry, saturday)).toBe(true)
    expect(isDue(laundry, monday)).toBe(false)
  })
})

describe('missingTasks', () => {
  test('makes the chores due on that day', () => {
    const made = missingTasks([cook, laundry], saturday, [], [])

    expect(made).toHaveLength(2)
    expect(made[0]).toMatchObject({
      templateId: 'cook',
      title: 'Cook dinner',
      categoryId: 'meals',
      start: '2026-10-10T18:00',
      durationMin: 60,
      status: 'todo',
    })
  })

  test('leaves out chores not due today', () => {
    const made = missingTasks([cook, laundry], monday, [], [])
    expect(made.map((task) => task.templateId)).toEqual(['cook'])
  })

  test('does not make one twice on the same day', () => {
    const already = [
      { id: 't1', templateId: 'cook', start: `${monday}T18:00`, durationMin: 60 },
    ]
    expect(missingTasks([cook], monday, already, [])).toEqual([])
  })

  test('still makes it on a different day', () => {
    const already = [
      { id: 't1', templateId: 'cook', start: `${monday}T18:00`, durationMin: 60 },
    ]
    expect(missingTasks([cook], saturday, already, [])).toHaveLength(1)
  })

  test('respects a chore you deleted on that day', () => {
    const skipped = [skipKey('cook', monday)]
    expect(missingTasks([cook], monday, [], skipped)).toEqual([])
    // ...but tomorrow's copy still arrives.
    expect(missingTasks([cook], saturday, [], skipped)).toHaveLength(1)
  })

  test('a moved chore still counts as made that day', () => {
    // You dragged dinner to 20:00; the time changed, the day didn't.
    const moved = [
      { id: 't1', templateId: 'cook', start: `${monday}T20:00`, durationMin: 60 },
    ]
    expect(missingTasks([cook], monday, moved, [])).toEqual([])
  })
})
