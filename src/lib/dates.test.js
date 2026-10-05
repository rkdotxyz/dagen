import { describe, expect, test } from 'vitest'
import {
  DURATIONS,
  QUARTER_TIMES,
  endTime,
  formatDay,
  formatDuration,
  formatRange,
  makeStart,
  nextQuarter,
  splitStart,
  toISODate,
  toMinutes,
  toTime,
} from './dates.js'

describe('days', () => {
  test('builds a local date, not a UTC one', () => {
    // Just before midnight in local time. toISOString() would say the 6th
    // in Stockholm; we want the day you actually see on the clock.
    const date = new Date(2026, 9, 5, 23, 30) // month 9 = October
    expect(toISODate(date)).toBe('2026-10-05')
  })

  test('pads single digits', () => {
    expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09')
  })

  test('names today and tomorrow', () => {
    const now = new Date(2026, 9, 5, 12, 0)
    expect(formatDay('2026-10-05', now)).toBe('Today')
    expect(formatDay('2026-10-06', now)).toBe('Tomorrow')
  })

  test('names other days with weekday, date and month', () => {
    const now = new Date(2026, 9, 5, 12, 0)
    expect(formatDay('2026-10-10', now)).toBe('Sat 10 Oct')
  })

  test('crosses a month end when naming tomorrow', () => {
    const now = new Date(2026, 9, 31, 12, 0)
    expect(formatDay('2026-11-01', now)).toBe('Tomorrow')
  })
})

describe('times', () => {
  test('converts both ways', () => {
    expect(toMinutes('14:30')).toBe(870)
    expect(toTime(870)).toBe('14:30')
    expect(toTime(0)).toBe('00:00')
  })

  test('wraps past midnight', () => {
    expect(toTime(1455)).toBe('00:15')
  })

  test('offers every quarter of the day', () => {
    expect(QUARTER_TIMES).toHaveLength(96)
    expect(QUARTER_TIMES[0]).toBe('00:00')
    expect(QUARTER_TIMES[95]).toBe('23:45')
  })

  test('rounds up to the next quarter', () => {
    expect(nextQuarter(new Date(2026, 9, 5, 14, 7))).toBe('14:15')
    expect(nextQuarter(new Date(2026, 9, 5, 14, 15))).toBe('14:15')
    expect(nextQuarter(new Date(2026, 9, 5, 14, 16))).toBe('14:30')
  })
})

describe('starts and durations', () => {
  test('joins and splits a start', () => {
    expect(makeStart('2026-10-05', '14:30')).toBe('2026-10-05T14:30')
    expect(splitStart('2026-10-05T14:30')).toEqual({
      day: '2026-10-05',
      time: '14:30',
    })
  })

  test('works out the end time', () => {
    expect(endTime('2026-10-05T14:30', 90)).toBe('16:00')
  })

  test('formats a range', () => {
    expect(formatRange('2026-10-05T14:30', 90)).toBe('14:30–16:00')
  })

  test('formats durations in hours and minutes', () => {
    expect(formatDuration(15)).toBe('15m')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(90)).toBe('1h 30m')
  })

  test('every duration chip is a whole number of quarters', () => {
    for (const duration of DURATIONS) {
      expect(duration % 15).toBe(0)
    }
  })
})
