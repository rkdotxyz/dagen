/*
  capacity.test.js — tests for src/lib/capacity.js.

  2026-11-23 is a Monday, so 2026-11-28 and 2026-11-29 are the weekend.
*/

import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from './migrate.js'
import {
  baseHours,
  daySummary,
  fixedHours,
  freeHours,
  isAway,
  mergeIntervals,
  monthSummary,
  plannedHours,
  weekSummary,
} from './capacity.js'
import { monthDays, weekDays } from './dates.js'

const settings = DEFAULT_SETTINGS // 8h on weekdays, 4h at weekends
const friday = '2026-11-27'

function task(id, changes) {
  return {
    id: id,
    title: id,
    start: null,
    day: null,
    durationMin: 60,
    status: 'todo',
    fixed: false,
    ...changes,
  }
}

const lecture = task('lecture', { fixed: true, start: `${friday}T10:00`, day: friday, durationMin: 120 })
const busyLab = { id: 'busy:1', start: `${friday}T11:00`, durationMin: 120, status: 'todo', external: true }
const essay = task('essay', { day: friday, durationMin: 180 })
const timedTask = task('cv', { start: `${friday}T15:00`, day: friday, durationMin: 90 })

describe('baseHours and away days', () => {
  test('weekdays and weekends have their own hours', () => {
    expect(baseHours(friday, settings)).toBe(8)
    expect(baseHours('2026-11-28', settings)).toBe(4)
    expect(baseHours('2026-11-29', settings)).toBe(4)
  })

  test('a day inside an away block is away, the edges included', () => {
    const away = [{ id: 'w', title: 'Winter trip', startDay: '2026-12-18', endDay: '2027-01-05' }]
    expect(isAway('2026-12-18', away)).toBe(true)
    expect(isAway('2027-01-05', away)).toBe(true)
    expect(isAway('2026-12-17', away)).toBe(false)
  })
})

describe('mergeIntervals', () => {
  test('joins overlapping and touching blocks, keeps separate ones apart', () => {
    expect(mergeIntervals([[600, 720], [660, 780], [780, 840], [900, 960]])).toEqual([
      [600, 840],
      [900, 960],
    ])
  })
})

describe('fixedHours', () => {
  test('counts overlapping fixed time once', () => {
    // Lecture 10–12 and a busy lab 11–13: 3 hours, not 4.
    expect(fixedHours(friday, [lecture], [busyLab])).toBe(3)
  })

  test('ignores flexible tasks and other days', () => {
    const otherDay = task('x', { fixed: true, start: '2026-11-26T10:00', day: '2026-11-26' })
    expect(fixedHours(friday, [lecture, essay, otherDay], [])).toBe(2)
  })

  test('a fixed task with no time adds its length', () => {
    const allDay = task('exam prep', { fixed: true, day: friday, durationMin: 90 })
    expect(fixedHours(friday, [lecture, allDay], [])).toBe(3.5)
  })
})

describe('plannedHours', () => {
  test('adds flexible tasks on the day, timed or any time, not done ones', () => {
    const done = task('done', { day: friday, status: 'done', durationMin: 600 })
    expect(plannedHours(friday, [lecture, essay, timedTask, done])).toBe(4.5)
  })

  test('unplaced tasks belong to no day', () => {
    expect(plannedHours(friday, [task('loose', {})])).toBe(0)
  })
})

describe('freeHours', () => {
  test('base minus fixed minus planned', () => {
    // 8 − 3 (lecture + lab) − 4.5 (essay + cv) = 0.5
    expect(freeHours(friday, { tasks: [lecture, essay, timedTask], busy: [busyLab], settings })).toBe(0.5)
  })

  test('can go negative, which means overpacked', () => {
    const big = task('big', { day: friday, durationMin: 6 * 60 })
    expect(freeHours(friday, { tasks: [lecture, big], busy: [busyLab], settings })).toBe(-1)
  })

  test('an away day has zero, whatever is on it', () => {
    const away = [{ id: 'w', title: 'Trip', startDay: friday, endDay: friday }]
    const summary = daySummary(friday, { tasks: [essay], settings, away })
    expect(summary.free).toBe(0)
    expect(summary.away.title).toBe('Trip')
  })
})

describe('weekSummary and monthSummary', () => {
  test('total the days and list the overpacked ones', () => {
    const big = task('big', { day: friday, durationMin: 9 * 60 })
    const summary = weekSummary(weekDays(friday), { tasks: [big], settings })

    expect(summary.days).toHaveLength(7)
    expect(summary.base).toBe(5 * 8 + 2 * 4)
    expect(summary.planned).toBe(9)
    expect(summary.overpacked.map((item) => item.day)).toEqual([friday])
  })

  test('a month has one entry per day', () => {
    expect(monthSummary(monthDays(friday), { tasks: [], settings }).days).toHaveLength(30)
  })
})
