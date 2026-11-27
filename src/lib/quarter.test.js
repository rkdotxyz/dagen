/*
  quarter.test.js — tests for src/lib/quarter.js and src/lib/away.js.

  From 27 Nov 2026, the quarter is Nov, Dec and Jan: 1 Nov to 31 Jan.
*/

import { describe, expect, test } from 'vitest'
import { awayProblem, describeAway, sortedAway } from './away.js'
import {
  DAY_PX,
  awayBands,
  dayX,
  estimateWidth,
  laneFor,
  lanes,
  monthStarts,
  nextStatus,
  outcomeRows,
  placeLabels,
  quarterHeadline,
  quarterRange,
  trackedHours,
  weekStarts,
} from './quarter.js'

const range = quarterRange('2026-11-27')

function area(id, changes = {}) {
  return {
    id: id,
    name: id,
    categoryId: 'projects',
    status: 'active',
    monthlyBudgetHours: 10,
    startDay: null,
    endDay: null,
    archived: false,
    ...changes,
  }
}

function task(id, changes) {
  return { id: id, title: id, status: 'todo', fixed: false, start: null, day: null, due: null, ...changes }
}

describe('the range', () => {
  test('three months from the start of this month', () => {
    expect(range).toEqual({ start: '2026-11-01', end: '2027-02-01', days: 92 })
    expect(monthStarts(range)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01'])
    expect(weekStarts(range)[0]).toBe('2026-11-02')
    expect(dayX('2026-11-03', range)).toBe(2 * DAY_PX)
  })
})

describe('triage', () => {
  test('status cycles active, maintain, paused and back', () => {
    expect(nextStatus('active')).toBe('maintain')
    expect(nextStatus('maintain')).toBe('paused')
    expect(nextStatus('paused')).toBe('active')
  })

  test('the headline counts active Areas and warns above the limit', () => {
    const areas = [area('a'), area('b'), area('c', { status: 'paused' }), area('d', { archived: true })]
    expect(quarterHeadline(areas, 5)).toBe('2 active Areas this quarter')
    expect(quarterHeadline(areas, 1)).toBe('2 active Areas this quarter, more than 1')
    expect(quarterHeadline([area('a')], 5)).toBe('1 active Area this quarter')
  })
})

describe('which lanes are drawn', () => {
  const tasks = [
    task('Essay', { areaId: 'withDeadline', due: '2026-12-08' }),
    task('Crit', { areaId: 'withEvent', fixed: true, start: '2026-12-10T13:00', day: '2026-12-10' }),
    task('Lecture', { areaId: 'weekly', fixed: true, templateId: 'lec', start: '2026-12-01T10:00', day: '2026-12-01' }),
    task('Late', { areaId: 'outside', due: '2027-03-01' }),
  ]
  const areas = [
    area('withDates', { startDay: '2026-10-01', endDay: '2026-12-10' }),
    area('withDeadline'),
    area('withEvent'),
    area('weekly'),
    area('outside'),
    area('nothing'),
    area('archived', { archived: true, startDay: '2026-11-01' }),
  ]

  test('only Areas with dates or dated items in the range', () => {
    expect(lanes(areas, tasks, range).map((lane) => lane.area.id)).toEqual([
      'withDates',
      'withDeadline',
      'withEvent',
    ])
  })

  test('a bar is clipped to the range', () => {
    expect(laneFor(areas[0], tasks, range).bar).toEqual({ from: '2026-11-01', to: '2026-12-10' })
    expect(laneFor(area('open', { startDay: '2026-12-01' }), [], range).bar).toEqual({
      from: '2026-12-01',
      to: '2027-01-31',
    })
  })

  test('deadlines are round markers, one-off events square, weekly ones left out', () => {
    expect(laneFor(areas[1], tasks, range).markers).toEqual([
      { id: 'due:Essay', kind: 'deadline', day: '2026-12-08', label: 'Essay' },
    ])
    expect(laneFor(areas[2], tasks, range).markers[0].kind).toBe('event')
    expect(laneFor(areas[3], tasks, range).markers).toEqual([])
  })

  test('away blocks become bands across the range, clipped', () => {
    const bands = awayBands([{ id: 'w', title: 'Winter trip', startDay: '2026-12-18', endDay: '2027-03-05' }], range)
    expect(bands).toEqual([
      { id: 'w', title: 'Winter trip', x: dayX('2026-12-18', range), width: 45 * DAY_PX },
    ])
  })
})

describe('placeLabels', () => {
  const options = { radius: 5, gap: 4, trackWidth: 400, minWidth: 28 }

  test('a label with room goes to the right of its marker', () => {
    expect(placeLabels([{ id: 'a', x: 50, width: 60 }], options)).toEqual([
      { id: 'a', side: 'right', left: 59, width: 60 },
    ])
  })

  test('no room on the right: it flips to the left', () => {
    const placed = placeLabels(
      [
        { id: 'a', x: 100, width: 60 },
        { id: 'b', x: 130, width: 60 },
      ],
      options,
    )
    expect(placed[0]).toEqual({ id: 'a', side: 'left', left: 31, width: 60 })
    expect(placed[1].side).toBe('right')
  })

  test('no room either side: shortened, or hidden if too short to read', () => {
    const placed = placeLabels(
      [
        { id: 'a', x: 10, width: 100 },
        { id: 'b', x: 60, width: 100 },
        { id: 'c', x: 80, width: 100 },
        { id: 'd', x: 300, width: 40 },
      ],
      options,
    )
    expect(placed[0]).toEqual({ id: 'a', side: 'right', left: 19, width: 32 })
    expect(placed[1].side).toBe('hidden')
    expect(placed[2].side).toBe('right')
  })

  test('never overlaps: every shown label clears the markers and the other labels', () => {
    const markers = [10, 22, 40, 41, 90, 95, 200, 380].map((x, index) => ({
      id: String(index),
      x: x,
      width: 70,
    }))
    const placed = placeLabels(markers, options).filter((label) => label.side !== 'hidden')
    const overlap = ([a1, a2], [b1, b2]) => a1 < b2 - 0.001 && b1 < a2 - 0.001

    // Two markers a day apart can touch each other; that's the data. What
    // must never happen is a label covering a marker or another label.
    placed.forEach((label, index) => {
      const box = [label.left, label.left + label.width]
      for (const marker of markers) expect(overlap(box, [marker.x - 5, marker.x + 5])).toBe(false)
      placed.forEach((other, otherIndex) => {
        if (otherIndex !== index) {
          expect(overlap(box, [other.left, other.left + other.width])).toBe(false)
        }
      })
    })
    for (const label of placed) {
      expect(label.left).toBeGreaterThanOrEqual(0)
      expect(label.left + label.width).toBeLessThanOrEqual(400)
    }
  })

  test('the last label stops at the end of the lane', () => {
    const [label] = placeLabels([{ id: 'a', x: 380, width: 60 }], options)
    expect(label.side).toBe('left')
  })

  test('width estimates grow with the text', () => {
    expect(estimateWidth('Crit')).toBeLessThan(estimateWidth('Final crit at NAVET'))
  })
})

describe('outcomes', () => {
  const entries = [
    { areaId: 'a', start: '2026-11-03T09:00', end: '2026-11-03T11:00' },
    { areaId: 'a', start: '2027-02-03T09:00', end: '2027-02-03T11:00' },
    { areaId: 'b', start: '2026-12-03T09:00', end: '2026-12-03T10:30' },
  ]

  test('tracked hours count only the range', () => {
    expect(trackedHours('a', entries, range)).toBe(2)
  })

  test('one row per active Area, against three months of budget', () => {
    const rows = outcomeRows([area('a'), area('b', { status: 'maintain' })], entries, range)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tracked: 2, budget: 30 })
  })
})

describe('away blocks', () => {
  test('need a name and a sensible range', () => {
    const good = { title: 'Trip', startDay: '2026-12-18', endDay: '2027-01-05' }
    expect(awayProblem(good)).toBeNull()
    expect(awayProblem({ ...good, startDay: '2026-12-18', endDay: '2026-12-18' })).toBeNull()
    expect(awayProblem({ ...good, title: ' ' })).toBe('Give it a name, like "Winter trip".')
    expect(awayProblem({ ...good, endDay: '' })).toBe('Add the first and last day.')
    expect(awayProblem({ ...good, endDay: '2026-12-01' })).toBe('The last day can’t be before the first.')
  })

  test('are described and listed earliest first', () => {
    expect(describeAway({ startDay: '2026-12-18', endDay: '2027-01-05' })).toBe('18 Dec – 5 Jan')
    expect(
      sortedAway([{ id: 'b', startDay: '2027-02-01' }, { id: 'a', startDay: '2026-12-18' }]).map((b) => b.id),
    ).toEqual(['a', 'b'])
  })
})
