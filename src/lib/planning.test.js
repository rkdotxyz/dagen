/*
  planning.test.js — tests for src/lib/planning.js: priorities, the To
  place order, Halve it, and the headline sentences.
*/

import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from './migrate.js'
import { weekSummary } from './capacity.js'
import { weekDays } from './dates.js'
import {
  clashCount,
  dayHeadline,
  freeNote,
  halved,
  toPlaceList,
  weekHeadline,
  weekPriorities,
  weekSubline,
} from './planning.js'

const today = '2026-11-27' // Friday of week 48
const week = weekDays(today) // 23–29 Nov

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
    rolled: 0,
    durationMin: 60,
    ...changes,
  }
}

describe('weekPriorities', () => {
  test('placed this week, due within 14 days, or fixed in the next 14 days', () => {
    const tasks = [
      task('placed', { priority: true, day: '2026-11-25' }),
      task('due soon', { priority: true, due: '2026-12-08' }),
      task('due later', { priority: true, due: '2026-12-20' }),
      task('not priority', { day: '2026-11-25' }),
      task('done', { priority: true, day: '2026-11-25', status: 'done' }),
      task('crit', { priority: true, fixed: true, day: '2026-12-04', start: '2026-12-04T13:00' }),
      task('old crit', { priority: true, fixed: true, day: '2026-11-24' }),
    ]

    expect(weekPriorities(tasks, week, today).map((item) => item.id)).toEqual([
      'placed',
      'crit',
      'due soon',
    ])
  })

  test('five at most', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      task(`p${index}`, { priority: true, day: '2026-11-28' }),
    )
    expect(weekPriorities(many, week, today)).toHaveLength(5)
  })
})

describe('toPlaceList', () => {
  test('earliest start-by first, then priority, then most pushed', () => {
    const tasks = [
      task('plain', {}),
      task('pushed', { rolled: 3 }),
      task('priority', { priority: true }),
      task('due later', { due: '2026-12-20' }),
      task('due sooner', { due: '2026-12-03' }),
      task('placed', { day: today }),
      task('done', { status: 'done' }),
    ]

    expect(toPlaceList(tasks).map((item) => item.id)).toEqual([
      'due sooner',
      'due later',
      'priority',
      'pushed',
      'plain',
    ])
  })
})

describe('halved', () => {
  test('half the estimate, to the quarter hour, and the count reset', () => {
    expect(halved(task('x', { durationMin: 180, rolled: 3 }))).toEqual({ durationMin: 90, rolled: 0 })
    expect(halved(task('x', { durationMin: 45 }))).toEqual({ durationMin: 30, rolled: 0 })
    expect(halved(task('x', { durationMin: 15 }))).toEqual({ durationMin: 15, rolled: 0 })
  })
})

describe('headlines', () => {
  const settings = DEFAULT_SETTINGS // 8h weekdays, 4h weekends: 48h a week

  test('a week with room says how much slack', () => {
    const tasks = [
      task('a', { day: '2026-11-26', durationMin: 300 }),
      task('b', { day: today, durationMin: 300 }),
    ]
    // 48 − 10 = 38h, and no single day is over.
    expect(weekHeadline(weekSummary(week, { tasks: tasks, settings }))).toBe('Week 48 has 38h of slack')
  })

  test('slack rounds down to the half hour', () => {
    const tasks = [
      task('a', { day: '2026-11-26', durationMin: 300 }),
      task('b', { day: today, durationMin: 280 }),
    ]
    // 48 − 9.67 = 38.33h, shown as 38h: never more than there is.
    expect(weekHeadline(weekSummary(week, { tasks: tasks, settings }))).toBe('Week 48 has 38h of slack')
  })

  test('one overpacked day is named', () => {
    const summary = weekSummary(week, { tasks: [task('a', { day: '2026-11-26', durationMin: 600 })], settings })
    expect(weekHeadline(summary)).toBe('Thursday is overpacked')
  })

  test('two are named, more are counted', () => {
    const two = [task('a', { day: '2026-11-26', durationMin: 600 }), task('b', { day: today, durationMin: 600 })]
    expect(weekHeadline(weekSummary(week, { tasks: two, settings }))).toBe(
      'Thursday and Friday are overpacked',
    )

    const three = [...two, task('c', { day: '2026-11-28', durationMin: 600 })]
    expect(weekHeadline(weekSummary(week, { tasks: three, settings }))).toBe('3 days are overpacked')
  })

  test('the sub-line gives dates, hours and clashes', () => {
    const lecture = task('l', { fixed: true, day: today, start: `${today}T10:00`, durationMin: 120 })
    const summary = weekSummary(week, { tasks: [lecture, task('a', { day: today, durationMin: 90 })], settings })
    expect(weekSubline(summary, 1)).toBe('23 Nov – 29 Nov · 2h fixed · 1.5h planned · 1 clash')
    expect(weekSubline(summary, 2)).toContain('2 clashes')
  })

  test('a day says how much is free, or by how much it is over', () => {
    expect(dayHeadline({ day: today, free: 3, away: null })).toBe('Friday · 3h free')
    expect(dayHeadline({ day: today, free: -0.5, away: null })).toBe('Friday is overpacked by 0.5h')
    expect(dayHeadline({ day: today, free: 0, away: { title: 'Trip' } })).toBe('Friday · away')
    expect(freeNote({ free: 3.5, away: null })).toBe('3.5h free')
    expect(freeNote({ free: -2, away: null })).toBe('over 2h')
  })
})

describe('clashCount', () => {
  test('counts each clashing pair once', () => {
    const conflicts = { a: [{ id: 'b' }], b: [{ id: 'a' }, { id: 'c' }], c: [{ id: 'b' }] }
    expect(clashCount(conflicts, ['a', 'b', 'c'])).toBe(2)
  })
})
