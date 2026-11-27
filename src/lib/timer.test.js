/*
  timer.test.js — tests for src/lib/timer.js.

  Moments are built with local times ("2026-11-27T13:00"), so the expected
  starts and ends read the same as the inputs, whatever the time zone.
*/

import { describe, expect, test } from 'vitest'
import {
  canLogAsPlanned,
  elapsedSeconds,
  entriesOn,
  entryMinutes,
  entryProblem,
  formatClock,
  isLogged,
  lastEntry,
  logAsPlanned,
  startTimer,
  stopTimer,
  timerFor,
} from './timer.js'

const at = (local) => new Date(local)
const empty = { activeTimer: null, entries: [] }

const essay = {
  id: 't1',
  title: 'Essay',
  categoryId: 'learning',
  areaId: 'a_kth',
  start: '2026-11-27T13:00',
  day: '2026-11-27',
  durationMin: 90,
}

describe('starting and stopping', () => {
  test('starting runs a timer with the task details', () => {
    const { state } = startTimer(empty, timerFor(essay), at('2026-11-27T13:02:00'))
    expect(state.activeTimer).toMatchObject({
      taskId: 't1',
      areaId: 'a_kth',
      categoryId: 'learning',
      label: 'Essay',
    })
    expect(state.entries).toEqual([])
  })

  test('every stop saves exactly one entry', () => {
    const started = startTimer(empty, timerFor(essay), at('2026-11-27T13:02:00')).state
    const { state, entry, discarded } = stopTimer(started, at('2026-11-27T14:40:30'))

    expect(discarded).toBe(false)
    expect(state.activeTimer).toBeNull()
    expect(state.entries).toEqual([entry])
    expect(entry).toMatchObject({
      taskId: 't1',
      categoryId: 'learning',
      label: 'Essay',
      start: '2026-11-27T13:02',
      end: '2026-11-27T14:40',
      source: 'timer',
    })
  })

  test('a new start stops the old timer and saves it', () => {
    const first = startTimer(empty, timerFor(essay), at('2026-11-27T13:00:00')).state
    const second = startTimer(first, { label: 'Email', categoryId: 'personal' }, at('2026-11-27T13:30:00'))

    expect(second.entry).toMatchObject({ label: 'Essay', end: '2026-11-27T13:30' })
    expect(second.state.entries).toHaveLength(1)
    expect(second.state.activeTimer).toMatchObject({ label: 'Email', taskId: null })
  })

  test('under a minute is thrown away, and says so', () => {
    const started = startTimer(empty, timerFor(essay), at('2026-11-27T13:00:00')).state
    const result = stopTimer(started, at('2026-11-27T13:00:59'))

    expect(result.discarded).toBe(true)
    expect(result.entry).toBeNull()
    expect(result.state).toEqual(empty)
  })

  test('stopping with nothing running changes nothing', () => {
    const result = stopTimer(empty, at('2026-11-27T13:00:00'))
    expect(result.state).toBe(empty)
    expect(result.entry).toBeNull()
  })
})

describe('the clock', () => {
  test('counts whole seconds and formats them', () => {
    const timer = { startedAt: at('2026-11-27T13:00:00').toISOString() }
    expect(elapsedSeconds(timer, at('2026-11-27T14:02:05'))).toBe(3725)
    expect(formatClock(3725)).toBe('01:02:05')
    expect(formatClock(0)).toBe('00:00:00')
  })

  test('never goes below zero', () => {
    const timer = { startedAt: at('2026-11-27T13:00:10').toISOString() }
    expect(elapsedSeconds(timer, at('2026-11-27T13:00:00'))).toBe(0)
  })
})

describe('log as planned', () => {
  test('makes an entry from the planned slot', () => {
    expect(logAsPlanned(essay)).toMatchObject({
      taskId: 't1',
      start: '2026-11-27T13:00',
      end: '2026-11-27T14:30',
      source: 'as-planned',
    })
  })

  test('is offered once a block is over, and only once', () => {
    const after = at('2026-11-27T15:00:00')
    expect(canLogAsPlanned(essay, [], at('2026-11-27T14:00:00'))).toBe(false) // not over yet
    expect(canLogAsPlanned(essay, [], after)).toBe(true)

    const entries = [logAsPlanned(essay)]
    expect(isLogged(essay, '2026-11-27', entries)).toBe(true)
    expect(canLogAsPlanned(essay, entries, after)).toBe(false)
  })

  test('a timer entry that day counts as logged too', () => {
    const timed = { taskId: 't1', start: '2026-11-27T13:05', end: '2026-11-27T13:50' }
    expect(canLogAsPlanned(essay, [timed], at('2026-11-27T15:00:00'))).toBe(false)
  })

  test('tasks without a time, and busy events, have nothing to log', () => {
    expect(canLogAsPlanned({ ...essay, start: null }, [], at('2026-11-28T00:00'))).toBe(false)
    expect(canLogAsPlanned({ ...essay, external: true }, [], at('2026-11-28T00:00'))).toBe(false)
  })
})

describe('the day\'s log', () => {
  const entries = [
    { id: 'b', start: '2026-11-27T15:00', end: '2026-11-27T16:00' },
    { id: 'a', start: '2026-11-27T09:00', end: '2026-11-27T10:30' },
    { id: 'c', start: '2026-11-26T09:00', end: '2026-11-26T09:30' },
  ]

  test('lists one day\'s entries, earliest first', () => {
    expect(entriesOn('2026-11-27', entries).map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  test('the last one ended is what Resume picks', () => {
    expect(lastEntry(entries).id).toBe('b')
    expect(lastEntry([])).toBeNull()
  })

  test('lengths in minutes, across midnight too', () => {
    expect(entryMinutes(entries[1])).toBe(90)
    expect(entryMinutes({ start: '2026-11-27T23:30', end: '2026-11-28T00:15' })).toBe(45)
  })
})

describe('checking a hand-logged entry', () => {
  const good = { label: 'Reading', areaId: null, start: '2026-11-27T09:00', end: '2026-11-27T10:00' }

  test('a label or an Area, a start and an end after it', () => {
    expect(entryProblem(good)).toBeNull()
    expect(entryProblem({ ...good, label: ' ', areaId: 'a_kth' })).toBeNull()
    expect(entryProblem({ ...good, label: '' })).toBe('Add what you worked on, or pick an Area.')
    expect(entryProblem({ ...good, end: '2026-11-27T09:00' })).toBe('The end must be after the start.')
    expect(entryProblem({ ...good, start: '' })).toBe('Add a start and an end time.')
  })
})
