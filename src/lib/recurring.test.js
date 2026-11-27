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

describe('Phase 11 fields on chore copies', () => {
  test('a copy is a complete task, placed on its day', () => {
    const [made] = missingTasks([cook], monday, [], [])
    expect(made).toMatchObject({
      day: monday,
      start: `${monday}T18:00`,
      areaId: null,
      fixed: false,
      due: null,
      priority: false,
      rolled: 0,
      doneAt: null,
    })
  })

  test('a rule can carry an Area and be fixed', () => {
    const lecture = { ...cook, id: 'lec', areaId: 'a_kth', fixed: true }
    expect(missingTasks([lecture], monday, [], [])[0]).toMatchObject({
      areaId: 'a_kth',
      fixed: true,
    })
  })

  test('a copy you unplaced still counts as made, so no second one appears', () => {
    // Its start is gone but it remembers its day, and nothing crashes.
    const unplacedCopy = { id: 'x', templateId: 'cook', start: null, day: monday }
    expect(missingTasks([cook], monday, [unplacedCopy], [])).toEqual([])
  })

  test('an unplaced task with no day at all is skipped safely', () => {
    const loose = { id: 'y', templateId: 'cook', start: null, day: null }
    expect(missingTasks([cook], monday, [loose], [])).toHaveLength(1)
  })
})
