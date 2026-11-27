/*
  month.test.js — tests for src/lib/month.js.

  November 2026 starts on a Sunday and ends on a Monday, so its grid runs
  from Mon 26 Oct to Sun 6 Dec: six weeks.
*/

import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from './migrate.js'
import { monthSummary } from './capacity.js'
import { monthDays } from './dates.js'
import {
  budgetAreas,
  budgetCheck,
  cellLabels,
  deadlinesIn,
  monthGrid,
  monthHeadline,
  monthName,
  monthSubline,
  monthWeekStarts,
  nudgedBudget,
  shiftMonth,
  startOfMonth,
  trackedHoursIn,
} from './month.js'
import { previewChores } from './recurring.js'

const day = '2026-11-27'

function task(id, changes) {
  return {
    id: id,
    title: id,
    status: 'todo',
    fixed: false,
    priority: false,
    start: null,
    day: null,
    due: null,
    durationMin: 60,
    ...changes,
  }
}

describe('the calendar', () => {
  test('whole weeks, Monday first, covering the month', () => {
    const weeks = monthGrid(day)
    expect(weeks).toHaveLength(6)
    expect(weeks[0][0]).toBe('2026-10-26')
    expect(weeks[5][6]).toBe('2026-12-06')
    expect(monthWeekStarts(day)[1]).toBe('2026-11-02')
  })

  test('moving month by month lands on the 1st', () => {
    expect(startOfMonth('2026-01-31')).toBe('2026-01-01')
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-01')
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-01')
    expect(monthName('2026-12-03')).toBe('December')
    expect(monthName('2026-12-03', true)).toBe('December 2026')
  })
})

describe('cell labels', () => {
  test('deadlines go on their due day, first', () => {
    const tasks = [
      task('Essay', { due: '2026-12-08' }),
      task('Crit', { fixed: true, start: '2026-12-08T13:00', day: '2026-12-08' }),
    ]
    expect(cellLabels('2026-12-08', tasks).labels.map((label) => label.text)).toEqual([
      'Due: Essay',
      'Crit',
    ])
    expect(cellLabels('2026-12-07', tasks).labels).toEqual([])
  })

  test('weekly things are left out: chores, rule-made lectures, repeating events', () => {
    const tasks = [
      task('Lecture', { fixed: true, templateId: 'lec', start: '2026-12-08T10:00', day: '2026-12-08' }),
    ]
    const busy = [
      { id: 'busy:1', title: 'Seminar', start: '2026-12-08T13:00', recurring: true, external: true },
      { id: 'busy:2', title: 'Flight', start: '2026-12-08T18:00', recurring: false, external: true },
    ]
    expect(cellLabels('2026-12-08', tasks, busy).labels.map((label) => label.text)).toEqual(['Flight'])
  })

  test('priorities show, done deadlines don\'t, and extras are counted', () => {
    const tasks = [
      task('a', { due: '2026-12-08' }),
      task('b', { due: '2026-12-08' }),
      task('c', { priority: true, day: '2026-12-08' }),
      task('d', { due: '2026-12-08', status: 'done' }),
    ]
    const result = cellLabels('2026-12-08', tasks)
    expect(result.labels.map((label) => label.text)).toEqual(['Due: a', 'Due: b'])
    expect(result.more).toBe(1)
  })
})

describe('headline and sub-line', () => {
  const settings = DEFAULT_SETTINGS
  const days = monthDays(day) // November 2026: 21 weekdays, 9 weekend days

  test('a month with room says how much is free', () => {
    const summary = monthSummary(days, { tasks: [], settings })
    // 21 × 8 + 9 × 4 = 204
    expect(monthHeadline(summary, day)).toBe('November has 204h free')
  })

  test('overpacked days are counted instead', () => {
    const tasks = [
      task('a', { day: '2026-11-26', durationMin: 600 }),
      task('b', { day: '2026-11-27', durationMin: 600 }),
    ]
    expect(monthHeadline(monthSummary(days, { tasks, settings }), day)).toBe(
      '2 overpacked days in November',
    )
    expect(monthHeadline(monthSummary(days, { tasks: tasks.slice(0, 1), settings }), day)).toBe(
      '1 overpacked day in November',
    )
  })

  test('the sub-line gives planned hours, deadlines and tracked time', () => {
    const tasks = [
      task('a', { day: '2026-11-10', durationMin: 90 }),
      task('b', { due: '2026-11-30' }),
      task('c', { due: '2026-12-01' }),
    ]
    const entries = [
      { start: '2026-11-03T09:00', end: '2026-11-03T11:30' },
      { start: '2026-10-31T09:00', end: '2026-10-31T10:00' },
    ]
    const summary = monthSummary(days, { tasks, settings })
    expect(deadlinesIn(day, tasks)).toBe(1)
    expect(trackedHoursIn(day, entries)).toBe(2.5)
    expect(monthSubline(summary, 1, 2.5)).toBe('1.5h planned · 1 deadline · 2.5h tracked')
  })
})

describe('budgets', () => {
  const areas = [
    { id: 'a', status: 'active', monthlyBudgetHours: 30, archived: false },
    { id: 'b', status: 'maintain', monthlyBudgetHours: 8, archived: false },
    { id: 'c', status: 'paused', monthlyBudgetHours: 50, archived: false },
    { id: 'd', status: 'active', monthlyBudgetHours: 50, archived: true },
  ]

  test('paused and archived Areas have no budget row', () => {
    expect(budgetAreas(areas).map((area) => area.id)).toEqual(['a', 'b'])
  })

  // A summary with just the per-day numbers budgetCheck reads.
  const month = (...days) => ({ days: days.map(([base, fixed]) => ({ base: base, fixed: fixed })) })

  test('budgets that fit leave some unbudgeted', () => {
    const check = budgetCheck(areas, month([30, 6], [30, 6]))
    expect(check).toMatchObject({ total: 38, room: 48, over: false })
    expect(check.message).toBe('10h unbudgeted. Keep some slack.')
  })

  test('budgets that don\'t fit say by how much', () => {
    const check = budgetCheck(areas, month([20, 7], [20, 7]))
    expect(check).toMatchObject({ total: 38, room: 26, over: true, difference: 12 })
    expect(check.message).toBe('Over by 12h. Lower a budget or pause an Area.')
  })

  test('exactly full is said too', () => {
    expect(budgetCheck(areas, month([38, 0])).message).toBe(
      'Every hour is budgeted. Keep some slack.',
    )
  })

  test('fixed time on a day with no hours takes nothing from the others', () => {
    // An away day (base 0) with a 2h lecture, next to a normal 8h day.
    expect(budgetCheck(areas, month([0, 2], [8, 0])).room).toBe(8)
  })

  test('− and + move an hour, never below zero', () => {
    expect(nudgedBudget({ monthlyBudgetHours: 8 }, 1)).toBe(9)
    expect(nudgedBudget({ monthlyBudgetHours: 0 }, -1)).toBe(0)
  })
})

describe('previewChores', () => {
  test('shows the chores that would exist, without making real ones', () => {
    const lecture = { id: 'lec', title: 'Lecture', categoryId: 'classes', repeat: 'weekly', weekday: 1, time: '10:00', durationMin: 120, fixed: true }
    const previews = previewChores([lecture], monthDays(day), [], [])

    // November 2026 has four Tuesdays.
    expect(previews).toHaveLength(4)
    expect(previews[0]).toMatchObject({ id: 'preview:lec:2026-11-03', fixed: true, start: '2026-11-03T10:00' })
  })

  test('skips days that already have their copy', () => {
    const lecture = { id: 'lec', title: 'Lecture', repeat: 'daily', time: '10:00', durationMin: 60 }
    const real = [{ id: 'x', templateId: 'lec', start: '2026-11-03T10:00', day: '2026-11-03' }]
    expect(previewChores([lecture], ['2026-11-03', '2026-11-04'], real, [])).toHaveLength(1)
  })
})
