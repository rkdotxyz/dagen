/*
  insights.test.js — tests for src/lib/insights.js.

  Every number is worked out by hand from the fixtures below, and every
  metric is also checked with no data at all: null or empty, never NaN.

  "Today" is Friday 27 Nov 2026. This week is 23–29 Nov.
*/

import { describe, expect, test } from 'vitest'
import {
  BUSY_SWITCHING,
  areasPerDay,
  balanceScore,
  budgetVsActual,
  categoryShares,
  entriesIn,
  estimateAccuracy,
  insightsHeadline,
  longestUntouched,
  mostBehind,
  pausedButUsed,
  periodRange,
  plannedByArea,
  plannedByCategory,
  timerAsEntry,
  topLabels,
  trackedByArea,
  trackedByCategory,
} from './insights.js'

const today = '2026-11-27'
const week = periodRange('week', today)

function area(id, changes = {}) {
  return { id: id, name: id, categoryId: 'projects', status: 'active', monthlyBudgetHours: 0, archived: false, ...changes }
}

function entry(id, start, end, changes = {}) {
  return { id: id, taskId: null, areaId: null, categoryId: 'projects', label: id, start: start, end: end, source: 'timer', ...changes }
}

function task(id, changes) {
  return { id: id, title: id, categoryId: 'projects', areaId: null, status: 'todo', start: null, day: null, durationMin: 60, doneAt: null, ...changes }
}

const areas = [
  area('rk', { monthlyBudgetHours: 30.4 }), // 1h a day
  area('kth', { categoryId: 'classes', monthlyBudgetHours: 60.8 }), // 2h a day
  area('sv', { categoryId: 'learning', status: 'maintain', monthlyBudgetHours: 30.4 }),
  area('gb', { status: 'paused' }),
  area('old', { archived: true }),
]

const entries = [
  entry('Exhibit', '2026-11-24T09:00', '2026-11-24T12:00', { areaId: 'rk' }), // 3h projects
  entry('Lecture notes', '2026-11-25T10:00', '2026-11-25T11:00', { areaId: 'kth', categoryId: 'classes' }), // 1h classes
  entry('Swedish', '2026-11-26T17:00', '2026-11-26T18:30', { areaId: 'sv', categoryId: 'learning' }), // 1.5h learning
  entry('Bloom', '2026-11-26T20:00', '2026-11-26T20:30', { areaId: 'gb' }), // 0.5h projects
  entry('Last week', '2026-11-20T09:00', '2026-11-20T10:00', { areaId: 'rk' }), // outside the week
]

describe('ranges', () => {
  test('week, month and quarter around today', () => {
    expect(week).toEqual({ from: '2026-11-23', to: '2026-11-29', name: 'This week', within: 'this week' })
    expect(periodRange('month', today)).toMatchObject({ from: '2026-11-01', to: '2026-11-30', name: 'November' })
    expect(periodRange('quarter', today)).toMatchObject({ from: '2026-11-01', to: '2027-01-31', name: 'Nov – Jan' })
  })
})

describe('tracked time', () => {
  const inWeek = entriesIn(week, entries)

  test('only entries that started in the range', () => {
    expect(inWeek.map((item) => item.id)).toEqual(['Exhibit', 'Lecture notes', 'Swedish', 'Bloom'])
  })

  test('the running timer counts up to now', () => {
    const timer = { taskId: null, areaId: 'rk', categoryId: 'projects', label: 'Now', startedAt: new Date('2026-11-27T14:00').toISOString() }
    const running = timerAsEntry(timer, new Date('2026-11-27T15:30'))
    expect(running).toMatchObject({ start: '2026-11-27T14:00', end: '2026-11-27T15:30', areaId: 'rk' })
    expect(entriesIn(week, entries, timer, new Date('2026-11-27T15:30'))).toHaveLength(5)
    expect(timerAsEntry(null, new Date())).toBeNull()
  })

  test('by category and by Area', () => {
    expect(trackedByCategory(inWeek)).toEqual({ projects: 3.5, classes: 1, learning: 1.5 })
    expect(trackedByArea(inWeek)).toEqual({ rk: 3, kth: 1, sv: 1.5, gb: 0.5 })
  })

  test('nothing tracked gives empty totals', () => {
    expect(trackedByCategory([])).toEqual({})
  })
})

describe('planned time', () => {
  const tasks = [
    task('a', { day: '2026-11-24', durationMin: 120, areaId: 'rk' }),
    task('b', { start: '2026-11-27T09:00', day: '2026-11-27', durationMin: 60, categoryId: 'classes', fixed: true }),
    task('tomorrow', { day: '2026-11-28', durationMin: 600 }), // after today: not yet
    task('loose', { durationMin: 300 }), // unplaced
  ]

  test('only placed days up to today, fixed and flexible', () => {
    expect(plannedByCategory(week, tasks, today)).toEqual({ projects: 2, classes: 1 })
    expect(plannedByArea(week, tasks, today)).toEqual({ rk: 2 })
  })
})

describe('budgets', () => {
  const rows = budgetVsActual(areas, entriesIn(week, entries), week)

  test('monthly budgets scaled to the range; paused and archived left out', () => {
    expect(rows.map((row) => row.area.id)).toEqual(['rk', 'kth', 'sv'])
    // 7 days: rk 7h, kth 14h, sv 7h.
    expect(rows.map((row) => Math.round(row.budget * 10) / 10)).toEqual([7, 14, 7])
    expect(rows.map((row) => row.actual)).toEqual([3, 1, 1.5])
  })

  test('most behind: the active Area with the lowest share of its budget', () => {
    // rk 3/7 = 0.43, kth 1/14 = 0.07. sv is on maintain, so it isn't judged.
    expect(mostBehind(rows).area.id).toBe('kth')
    expect(mostBehind([])).toBeNull()
  })
})

describe('Areas left alone', () => {
  test('untouched longest, with never counting as longest', () => {
    const result = longestUntouched(areas, entries, today)
    // Every live, non-paused Area has an entry. rk's last is the 24th
    // (3 days ago), kth's the 25th, sv's the 26th: rk has waited longest.
    expect(result).toMatchObject({ area: { id: 'rk' }, days: 3, last: '2026-11-24' })

    const withNew = longestUntouched([...areas, area('new')], entries, today)
    expect(withNew).toMatchObject({ area: { id: 'new' }, days: Infinity, last: null })
    expect(longestUntouched([], entries, today)).toBeNull()
  })

  test('paused but still used', () => {
    expect(pausedButUsed(areas, entriesIn(week, entries)).map((item) => item.id)).toEqual(['gb'])
    expect(pausedButUsed(areas, [])).toEqual([])
  })
})

describe('estimates vs reality', () => {
  test('tracked ÷ estimated for done tasks that have time logged', () => {
    const tasks = [
      task('essay', { status: 'done', doneAt: '2026-11-26T18:00', durationMin: 60 }),
      task('model', { status: 'done', doneAt: '2026-11-25T12:00', durationMin: 120 }),
      task('no time', { status: 'done', doneAt: '2026-11-25T12:00', durationMin: 600 }), // ignored
      task('not done', { durationMin: 60 }),
    ]
    const logged = [
      entry('e1', '2026-11-26T09:00', '2026-11-26T10:30', { taskId: 'essay' }), // 90m
      entry('e2', '2026-11-25T09:00', '2026-11-25T12:00', { taskId: 'model' }), // 180m
      entry('e3', '2026-11-25T09:00', '2026-11-25T10:00', { taskId: 'not done' }),
    ]
    // (90 + 180) / (60 + 120) = 1.5
    expect(estimateAccuracy(tasks, logged, week)).toBe(1.5)
  })

  test('null when there is nothing to compare', () => {
    expect(estimateAccuracy([], [], week)).toBeNull()
    expect(estimateAccuracy([task('x', { status: 'done', doneAt: '2026-11-26T10:00' })], [], week)).toBeNull()
  })
})

describe('switching and where the hours went', () => {
  test('different Areas per day over the last 14 days', () => {
    const days = areasPerDay(entries, today, 14)
    expect(days).toHaveLength(14)
    expect(days[13]).toEqual({ day: '2026-11-27', count: 0 })
    expect(days.find((item) => item.day === '2026-11-26').count).toBe(2) // sv and gb
    expect(BUSY_SWITCHING).toBe(6)
  })

  test('the top labels by tracked time', () => {
    expect(topLabels(entriesIn(week, entries), 2)).toEqual([
      { label: 'Exhibit', hours: 3 },
      { label: 'Swedish', hours: 1.5 },
    ])
    expect(topLabels([])).toEqual([])
  })
})

describe('shares, balance and the headline', () => {
  const tracked = { projects: 3.5, classes: 1, learning: 1.5 }

  test('shares follow the order of the categories', () => {
    expect(categoryShares(tracked).map((item) => [item.category.id, item.share])).toEqual([
      ['classes', 1 / 6],
      ['projects', 3.5 / 6],
      ['learning', 1.5 / 6],
    ])
    expect(categoryShares({})).toEqual([])
  })

  test('balance: 100 when tracked matches planned, lower as they drift', () => {
    expect(balanceScore({ projects: 2, classes: 2 }, { projects: 1, classes: 1 })).toBe(100)
    // Planned all projects, tracked all classes: the gap is 2, more than 1.2.
    expect(balanceScore({ projects: 1 }, { classes: 1 })).toBe(0)
    // Planned 50/50, tracked 75/25: gap 0.5, so 100 − 0.5 × 100 / 1.2 = 58.
    expect(balanceScore({ projects: 1, classes: 1 }, { projects: 3, classes: 1 })).toBe(58)
    expect(balanceScore({}, tracked)).toBeNull()
  })

  test('the headline names the top two and the neglected one', () => {
    const planned = { projects: 2, classes: 2, learning: 1, personal: 3 }
    expect(insightsHeadline(periodRange('month', today), tracked, planned)).toBe(
      'November went to Projects and Learning; Personal got 0%',
    )
    expect(insightsHeadline(week, { classes: 1 }, {})).toBe('This week went to Classes')
    expect(insightsHeadline(week, {}, planned)).toBe('Nothing tracked this week yet')
  })
})
