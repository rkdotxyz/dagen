import { describe, expect, test } from 'vitest'
import { conflictsById, findConflicts, overlaps } from './conflicts.js'

// A small helper so each test reads as a sentence rather than an object.
function task(id, start, durationMin, status = 'todo') {
  return { id: id, title: id, start: start, durationMin: durationMin, status: status }
}

describe('overlaps', () => {
  test('two tasks at the same time overlap', () => {
    expect(
      overlaps(task('a', '2026-10-05T10:00', 60), task('b', '2026-10-05T10:30', 60)),
    ).toBe(true)
  })

  test('back-to-back tasks do not overlap', () => {
    expect(
      overlaps(task('a', '2026-10-05T10:00', 60), task('b', '2026-10-05T11:00', 60)),
    ).toBe(false)
  })

  test('one task inside another overlaps', () => {
    expect(
      overlaps(task('a', '2026-10-05T10:00', 120), task('b', '2026-10-05T10:30', 15)),
    ).toBe(true)
  })

  test('the same times on different days do not overlap', () => {
    expect(
      overlaps(task('a', '2026-10-05T10:00', 60), task('b', '2026-10-06T10:00', 60)),
    ).toBe(false)
  })

  test('the order of the two tasks makes no difference', () => {
    const a = task('a', '2026-10-05T10:00', 60)
    const b = task('b', '2026-10-05T10:30', 60)
    expect(overlaps(a, b)).toBe(overlaps(b, a))
  })
})

describe('findConflicts', () => {
  const laundry = task('laundry', '2026-10-05T10:00', 60)
  const call = task('call', '2026-10-05T10:30', 30)
  const walk = task('walk', '2026-10-05T15:00', 30)

  test('finds the clashing task', () => {
    expect(findConflicts(laundry, [laundry, call, walk])).toEqual([call])
  })

  test('a task never clashes with itself', () => {
    expect(findConflicts(walk, [walk])).toEqual([])
  })

  test('a finished task blocks nothing', () => {
    const doneCall = { ...call, status: 'done' }
    expect(findConflicts(laundry, [laundry, doneCall])).toEqual([])
  })

  test('a finished task has no conflicts of its own', () => {
    const doneLaundry = { ...laundry, status: 'done' }
    expect(findConflicts(doneLaundry, [doneLaundry, call])).toEqual([])
  })
})

describe('conflictsById', () => {
  test('lists both sides of a clash', () => {
    const laundry = task('laundry', '2026-10-05T10:00', 60)
    const call = task('call', '2026-10-05T10:30', 30)

    const result = conflictsById([laundry, call])

    expect(result.laundry).toEqual([call])
    expect(result.call).toEqual([laundry])
  })

  test('leaves clash-free tasks out altogether', () => {
    const walk = task('walk', '2026-10-05T15:00', 30)
    expect(conflictsById([walk])).toEqual({})
  })
})
