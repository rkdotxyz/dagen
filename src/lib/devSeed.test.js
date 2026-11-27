/*
  devSeed.test.js — the sample planner has what the spec asks for.
*/

import { describe, expect, test } from 'vitest'
import { buildSeed } from './devSeed.js'
import { conflictsById } from './conflicts.js'
import { missingTasks } from './recurring.js'
import { addDays, startOfWeek } from './dates.js'

// A fixed "random" so the seed is the same every run.
function fixedRandom() {
  let n = 0.37
  return () => (n = (n * 9301 + 0.49297) % 1)
}

const today = '2026-11-27'
const seed = buildSeed(today, fixedRandom())

describe('the Horizon dev seed', () => {
  test("RK's 13 Areas: 6 active, 6 maintain, 1 paused", () => {
    expect(seed.areas).toHaveLength(13)
    const count = (status) => seed.areas.filter((area) => area.status === status).length
    expect([count('active'), count('maintain'), count('paused')]).toEqual([6, 6, 1])
  })

  test('weekly fixed rules for studio, lecture, lab and Swedish', () => {
    expect(seed.templates).toHaveLength(6)
    expect(seed.templates.every((template) => template.fixed && template.repeat === 'weekly')).toBe(true)
  })

  test('one clash on Thursday, with the lab', () => {
    const thursday = addDays(startOfWeek(today), 3)
    const lab = missingTasks(seed.templates, thursday, [], []).map((item, index) => ({ ...item, id: `lab${index}` }))
    const clashes = conflictsById([...seed.tasks, ...lab])
    expect(Object.keys(clashes)).toContain('s_call')
  })

  test('unplaced tasks: one pushed 3 times, deadlines 6 and 11 days out', () => {
    const unplaced = seed.tasks.filter((task) => !task.start && !task.day)
    expect(unplaced.some((task) => task.rolled === 3)).toBe(true)
    expect(unplaced.map((task) => task.due).filter(Boolean).sort()).toEqual([addDays(today, 6), addDays(today, 11)])
  })

  test('a winter trip, and about 40 days of tracked time', () => {
    expect(seed.away).toEqual([{ id: 'w_trip', title: 'Winter trip', startDay: '2026-12-18', endDay: '2027-01-05' }])
    const days = new Set(seed.entries.map((entry) => entry.start.slice(0, 10)))
    expect(days.size).toBeGreaterThanOrEqual(38)
    expect(seed.entries.every((entry) => entry.end > entry.start)).toBe(true)
  })

  test('nothing on a past day is left undone, so no rollover question', () => {
    expect(seed.tasks.filter((task) => task.day && task.day < today && task.status !== 'done' && !task.fixed)).toEqual([])
  })
})
