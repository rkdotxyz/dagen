/*
  areas.test.js — tests for src/lib/areas.js.

  The rule that matters most: removing an Area never leaves a task or a
  time entry pointing at nothing.
*/

import { describe, expect, test } from 'vitest'
import {
  activeCount,
  createArea,
  formatLastWorked,
  isInUse,
  lastWorkedOn,
  liveAreas,
  removeArea,
  updateArea,
} from './areas.js'

const now = new Date('2026-11-27T12:00')

const rk = createArea(
  { name: '  Räckvidd (NAVET) ', categoryId: 'projects', monthlyBudgetHours: 20 },
  'a_rk',
  now,
)
const swedish = createArea(
  { name: 'Swedish', categoryId: 'learning', status: 'maintain' },
  'a_sv',
  now,
)

describe('createArea', () => {
  test('makes a complete Area with a tidy name', () => {
    expect(rk).toEqual({
      id: 'a_rk',
      name: 'Räckvidd (NAVET)',
      categoryId: 'projects',
      status: 'active',
      monthlyBudgetHours: 20,
      outcome: '',
      startDay: null,
      endDay: null,
      createdAt: now.toISOString(),
      archived: false,
    })
  })
})

describe('updateArea', () => {
  test('changes one Area and leaves the others alone', () => {
    const next = updateArea([rk, swedish], 'a_sv', { status: 'paused' })
    expect(next[1].status).toBe('paused')
    expect(next[0]).toBe(rk)
  })
})

describe('removing an Area', () => {
  const task = { id: 't1', areaId: 'a_rk' }
  const entry = { id: 'e1', areaId: 'a_sv', start: '2026-11-20T10:00' }

  test('knows when tasks or entries still use it', () => {
    expect(isInUse('a_rk', [task], [])).toBe(true)
    expect(isInUse('a_sv', [], [entry])).toBe(true)
    expect(isInUse('a_rk', [], [])).toBe(false)
  })

  test('an Area nothing uses is deleted', () => {
    expect(removeArea([rk, swedish], 'a_rk', [], [])).toEqual([swedish])
  })

  test('an Area with tasks is archived, not deleted', () => {
    const next = removeArea([rk, swedish], 'a_rk', [task], [])
    expect(next).toHaveLength(2)
    expect(next[0].archived).toBe(true)
  })

  test('an Area with tracked time is archived too', () => {
    expect(removeArea([rk, swedish], 'a_sv', [], [entry])[1].archived).toBe(true)
  })

  test('archived Areas leave the pickers and the active count', () => {
    const next = removeArea([rk, swedish], 'a_rk', [task], [])
    expect(liveAreas(next)).toEqual([swedish])
    expect(activeCount(next)).toBe(0)
    expect(activeCount([rk, swedish])).toBe(1)
  })
})

describe('last worked on', () => {
  const entries = [
    { areaId: 'a_rk', start: '2026-11-20T10:00' },
    { areaId: 'a_rk', start: '2026-11-24T09:00' },
    { areaId: 'a_sv', start: '2026-11-26T17:15' },
  ]

  test('finds the latest day with tracked time', () => {
    expect(lastWorkedOn('a_rk', entries)).toBe('2026-11-24')
    expect(lastWorkedOn('a_none', entries)).toBeNull()
  })

  test('says it in words', () => {
    expect(formatLastWorked(null, now)).toBe('never')
    expect(formatLastWorked('2026-11-27', now)).toBe('today')
    expect(formatLastWorked('2026-11-26', now)).toBe('yesterday')
    expect(formatLastWorked('2026-11-24', now)).toBe('3d ago')
  })
})
