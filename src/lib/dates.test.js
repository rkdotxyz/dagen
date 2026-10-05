import { describe, expect, test } from 'vitest'
import {
  DURATIONS,
  QUARTER_TIMES,
  addDays,
  dayNumber,
  endTime,
  formatMonthLabel,
  formatDay,
  formatDuration,
  formatRange,
  makeStart,
  shiftStart,
  startOfWeek,
  weekDays,
  weekdayIndex,
  weekdayLetter,
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

describe('weeks', () => {
  test('moves days forwards and backwards', () => {
    expect(addDays('2026-10-05', 1)).toBe('2026-10-06')
    expect(addDays('2026-10-05', -1)).toBe('2026-10-04')
  })

  test('crosses month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29') // a leap year
  })

  test('weeks start on Monday', () => {
    // 2026-10-05 is a Monday, 2026-10-11 the Sunday after it.
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-08')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
  })

  test('a week is seven days, Monday to Sunday', () => {
    const days = weekDays('2026-10-08')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-10-05')
    expect(days[6]).toBe('2026-10-11')
  })

  test('counts weekdays from Monday', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0) // a Monday
    expect(weekdayIndex('2026-10-10')).toBe(5) // the Saturday after
    expect(weekdayIndex('2026-10-11')).toBe(6) // Sunday is last, not first
  })

  test('labels the days for the strip', () => {
    expect(dayNumber('2026-10-05')).toBe('5')
    expect(weekdayLetter('2026-10-05')).toBe('M')
    expect(weekdayLetter('2026-10-11')).toBe('S')
  })

  test('names the month, or both when the week straddles two', () => {
    expect(formatMonthLabel(weekDays('2026-10-08'))).toBe('October 2026')
    expect(formatMonthLabel(weekDays('2026-09-30'))).toBe('Sept – Oct 2026') // en-GB abbreviates September as "Sept"
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

  test('shifts a start by minutes', () => {
    expect(shiftStart('2026-10-05T14:30', 60)).toBe('2026-10-05T15:30')
    expect(shiftStart('2026-10-05T14:30', 15)).toBe('2026-10-05T14:45')
  })

  test('shifting past midnight changes the day', () => {
    expect(shiftStart('2026-10-05T23:30', 60)).toBe('2026-10-06T00:30')
    expect(shiftStart('2026-10-05T00:30', -60)).toBe('2026-10-04T23:30')
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
