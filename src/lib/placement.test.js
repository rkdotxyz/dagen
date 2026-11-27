/*
  placement.test.js — tests for src/lib/placement.js.

  The three placements (timed, any time, unplaced) decide where a task
  shows and whether Google hears about it, so each one is pinned here.
*/

import { describe, expect, test } from 'vitest'
import { dayOf, placementOf, timeOf, withDay } from './placement.js'

const timed = { id: 't', start: '2026-11-27T13:00', day: '2026-11-27' }
const anytime = { id: 'a', start: null, day: '2026-11-27' }
const unplaced = { id: 'u', start: null, day: null }

describe('placementOf', () => {
  test('names each of the three states', () => {
    expect(placementOf(timed)).toBe('timed')
    expect(placementOf(anytime)).toBe('anytime')
    expect(placementOf(unplaced)).toBe('unplaced')
  })

  test('a task with no placement fields at all is unplaced', () => {
    expect(placementOf({ id: 'x' })).toBe('unplaced')
  })
})

describe('dayOf and timeOf', () => {
  test('read the day and time of a timed task', () => {
    expect(dayOf(timed)).toBe('2026-11-27')
    expect(timeOf(timed)).toBe('13:00')
  })

  test('an any-time task has a day but no time', () => {
    expect(dayOf(anytime)).toBe('2026-11-27')
    expect(timeOf(anytime)).toBeNull()
  })

  test('an unplaced task has neither, and nothing crashes', () => {
    expect(dayOf(unplaced)).toBeNull()
    expect(timeOf(unplaced)).toBeNull()
  })

  test('the start wins if day and start ever disagree', () => {
    expect(dayOf({ start: '2026-11-28T09:00', day: '2026-11-27' })).toBe('2026-11-28')
  })
})

describe('withDay', () => {
  test('sets day from start', () => {
    expect(withDay({ start: '2026-11-28T09:00', day: null }).day).toBe('2026-11-28')
  })

  test('returns the very same task when nothing needs fixing', () => {
    expect(withDay(timed)).toBe(timed)
    expect(withDay(anytime)).toBe(anytime)
    expect(withDay(unplaced)).toBe(unplaced)
  })
})
