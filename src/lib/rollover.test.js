/*
  rollover.test.js — tests for src/lib/rollover.js.
*/

import { describe, expect, test } from 'vitest'
import { rollOver, rolloverCandidates, shouldRollOver } from './rollover.js'

const today = '2026-11-27'
const yesterday = '2026-11-26'

function task(id, changes) {
  return { id: id, status: 'todo', fixed: false, start: null, day: null, rolled: 0, ...changes }
}

const missed = task('missed', { start: `${yesterday}T10:00`, day: yesterday })
const missedAnytime = task('anytime', { day: yesterday, rolled: 1 })
const done = task('done', { day: yesterday, status: 'done' })
const fixed = task('fixed', { start: `${yesterday}T10:00`, day: yesterday, fixed: true })
const chore = task('chore', { start: `${yesterday}T18:00`, day: yesterday, templateId: 'cook' })
const todays = task('today', { day: today })
const unplaced = task('loose', {})

const all = [missed, missedAnytime, done, fixed, chore, todays, unplaced]

describe('which tasks roll over', () => {
  test('unfinished flexible tasks from past days, timed or any time', () => {
    expect(rolloverCandidates(all, today).map((item) => item.id)).toEqual(['missed', 'anytime'])
  })

  test('never done, fixed or recurring ones, or today\'s, or unplaced ones', () => {
    for (const item of [done, fixed, chore, todays, unplaced]) {
      expect(shouldRollOver(item, today)).toBe(false)
    }
  })
})

describe('rollOver', () => {
  test('unplaces them and counts the push', () => {
    const result = rollOver(all, today)

    expect(result[0]).toMatchObject({ start: null, day: null, rolled: 1 })
    expect(result[1]).toMatchObject({ start: null, day: null, rolled: 2 })
    // Everything else is the very same object.
    for (let index = 2; index < all.length; index++) expect(result[index]).toBe(all[index])
  })

  test('running it twice changes nothing more', () => {
    const once = rollOver(all, today)
    expect(rollOver(once, today)).toBe(once)
  })

  test('returns the same array when nothing moves', () => {
    const list = [todays, unplaced]
    expect(rollOver(list, today)).toBe(list)
  })
})
