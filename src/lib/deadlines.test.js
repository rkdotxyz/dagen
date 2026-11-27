/*
  deadlines.test.js — tests for src/lib/deadlines.js.

  With 2 hours a day on a task and 1 day of buffer (config.js).
*/

import { describe, expect, test } from 'vitest'
import { deadlineLabel, deadlineState, startBy } from './deadlines.js'

const today = '2026-11-27' // a Friday

function task(durationMin, due, status = 'todo') {
  return { id: 't', durationMin: durationMin, due: due, status: status }
}

describe('startBy', () => {
  test('a 5h task due Fri 11 Dec: 3 days of work + 1 spare', () => {
    expect(startBy(task(300, '2026-12-11'))).toBe('2026-12-07')
  })

  test('a short task still gets a day of work and a day of buffer', () => {
    expect(startBy(task(30, '2026-12-11'))).toBe('2026-12-09')
  })

  test('exactly 2h is one day of work', () => {
    expect(startBy(task(120, '2026-12-11'))).toBe('2026-12-09')
  })

  test('no deadline, no start-by', () => {
    expect(startBy(task(60, null))).toBeNull()
  })
})

describe('deadlineState and its label', () => {
  test('overdue once the due day has passed', () => {
    expect(deadlineState(task(60, '2026-11-26'), today)).toBe('overdue')
    expect(deadlineLabel(task(60, '2026-11-26'), today)).toBe('overdue')
  })

  test('start now from the start-by day, until the deadline', () => {
    // Due Sun 29 Nov, 1h: start by Fri 27 Nov, which is today.
    expect(deadlineState(task(60, '2026-11-29'), today)).toBe('start-now')
    // Due today is not overdue yet.
    expect(deadlineState(task(60, today), today)).toBe('start-now')
    expect(deadlineLabel(task(60, today), today)).toBe('start now')
  })

  test('upcoming before that, with the date', () => {
    expect(deadlineState(task(300, '2026-12-11'), today)).toBe('upcoming')
    expect(deadlineLabel(task(300, '2026-12-11'), today)).toBe('start by Mon 7 Dec')
  })

  test('none for done tasks and tasks without a deadline', () => {
    expect(deadlineState(task(60, '2026-11-01', 'done'), today)).toBe('none')
    expect(deadlineState(task(60, null), today)).toBe('none')
    expect(deadlineLabel(task(60, null), today)).toBeNull()
  })
})
