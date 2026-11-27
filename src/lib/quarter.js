/*
  quarter.js — the rules behind the Quarter screen.

  A "quarter" here is a rolling three months starting from a month you
  choose (this month, to begin with), not a calendar quarter.

  Four jobs:
    1. Triage: each Area's status cycles active → maintain → paused.
    2. The timeline: which Areas get a lane, and what's on each lane (a bar
       from start to end, round markers for deadlines, square ones for
       one-off fixed events).
    3. Labels that never overlap: placeLabels decides, for each marker,
       whether its label goes right, flips left, gets shortened, or hides.
    4. Outcomes: hours tracked per Area against three months of budget.

  The screen measures in pixels: one day is DAY_PX wide, so a quarter is
  about 90 × DAY_PX. Keeping that a plain number is what lets the label
  rules be tested without a browser.
*/

import { addDays, daysBetween } from './dates.js'
import { liveAreas } from './areas.js'
import { shiftMonth, startOfMonth } from './month.js'
import { dayOf } from './placement.js'
import { entryMinutes } from './timer.js'

// How wide one day is on the timeline, in pixels.
export const DAY_PX = 9

// ---- The range ----

// The three months starting from the month a day is in:
// { start: "2026-11-01", end: "2027-02-01" (the day after the last),
//   days: 92 }.
export function quarterRange(day) {
  const start = startOfMonth(day)
  const end = shiftMonth(start, 3)
  return { start: start, end: end, days: daysBetween(start, end) }
}

export function inRange(day, range) {
  return Boolean(day) && day >= range.start && day < range.end
}

// Where a day sits on the timeline, in pixels from the left.
export function dayX(day, range) {
  return daysBetween(range.start, day) * DAY_PX
}

// The first of each month and every Monday in the range, for the ticks
// along the top.
export function monthStarts(range) {
  return [0, 1, 2].map((offset) => shiftMonth(range.start, offset))
}

export function weekStarts(range) {
  const mondays = []
  for (let day = range.start; day < range.end; day = addDays(day, 1)) {
    if (new Date(`${day}T12:00`).getDay() === 1) mondays.push(day)
  }
  return mondays
}

// ---- Triage ----

const NEXT_STATUS = { active: 'maintain', maintain: 'paused', paused: 'active' }

// Tapping an Area's chip moves it to the next column, round and round.
export function nextStatus(status) {
  return NEXT_STATUS[status] ?? 'active'
}

// "6 active Areas this quarter, more than 5" or "4 active Areas this quarter".
export function quarterHeadline(areas, limit) {
  const active = liveAreas(areas).filter((area) => area.status === 'active').length
  const noun = active === 1 ? 'Area' : 'Areas'
  if (active > limit) return `${active} active ${noun} this quarter, more than ${limit}`
  return `${active} active ${noun} this quarter`
}

// ---- The timeline ----

// What goes on one Area's lane in this range:
//   bar      { from, to } clipped to the range, or null if the Area has
//            no start or end day (or they're outside the range)
//   markers  deadlines (round) and one-off fixed events (square)
export function laneFor(area, tasks, range) {
  let bar = null
  if (area.startDay || area.endDay) {
    const from = area.startDay && area.startDay > range.start ? area.startDay : range.start
    const lastDay = addDays(range.end, -1)
    const to = area.endDay && area.endDay < lastDay ? area.endDay : lastDay
    if (from <= to) bar = { from: from, to: to }
  }

  const mine = tasks.filter((task) => task.areaId === area.id)
  const deadlines = mine
    .filter((task) => inRange(task.due, range) && task.status !== 'done')
    .map((task) => ({ id: `due:${task.id}`, kind: 'deadline', day: task.due, label: task.title }))
  const events = mine
    .filter((task) => task.fixed && !task.templateId && inRange(dayOf(task), range))
    .map((task) => ({ id: `fixed:${task.id}`, kind: 'event', day: dayOf(task), label: task.title }))

  const markers = [...deadlines, ...events].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  return { area: area, bar: bar, markers: markers }
}

// One lane per Area that has something to show in this range: dates
// that reach into it, or dated items in it. Archived Areas are left out.
export function lanes(areas, tasks, range) {
  return liveAreas(areas)
    .map((area) => laneFor(area, tasks, range))
    .filter((lane) => lane.bar !== null || lane.markers.length > 0)
}

// The away blocks that touch the range, clipped to it, as pixels.
export function awayBands(away, range) {
  const lastDay = addDays(range.end, -1)
  return away
    .filter((block) => block.startDay <= lastDay && block.endDay >= range.start)
    .map((block) => {
      const from = block.startDay > range.start ? block.startDay : range.start
      const to = block.endDay < lastDay ? block.endDay : lastDay
      return {
        id: block.id,
        title: block.title,
        x: dayX(from, range),
        width: (daysBetween(from, to) + 1) * DAY_PX,
      }
    })
}

// ---- Labels that never overlap ----

// A rough width for a label in pixels, from its length. Close enough for
// placing: CSS cuts anything longer short with "…".
export function estimateWidth(text, perChar = 6.2) {
  return Math.ceil(text.length * perChar) + 4
}

// Decides where each marker's label goes, on one lane.
//
// markers: [{ id, x, width }], x being the marker's centre.
// Options: radius (half a marker), gap (space between things), trackWidth
// (the lane's full width), minWidth (narrowest label worth showing).
//
// For each marker, left to right, the first of these that fits wins:
//   1. right, full width, before the next marker
//   2. left, full width, after whatever was placed before it
//   3. right, shortened to the room before the next marker
//   4. hidden (the marker stays; its name is still read out)
//
// Returns [{ id, side: 'right' | 'left' | 'hidden', left, width }].
export function placeLabels(markers, { radius = 5, gap = 4, trackWidth, minWidth = 28 }) {
  const sorted = [...markers].sort((a, b) => a.x - b.x)
  const placed = []
  // The right edge of the last thing on the lane: a marker or a label.
  let taken = -Infinity

  sorted.forEach((marker, index) => {
    const next = sorted[index + 1]
    // The label must stop before the next marker (or the lane's end).
    const limit = next ? next.x - radius - gap : trackWidth
    const rightStart = marker.x + radius + gap
    const leftEnd = marker.x - radius - gap

    let result
    if (rightStart + marker.width <= limit) {
      result = { side: 'right', left: rightStart, width: marker.width }
    } else if (leftEnd - marker.width >= Math.max(taken + gap, 0)) {
      result = { side: 'left', left: leftEnd - marker.width, width: marker.width }
    } else if (limit - rightStart >= minWidth) {
      result = { side: 'right', left: rightStart, width: limit - rightStart }
    } else {
      result = { side: 'hidden', left: 0, width: 0 }
    }

    placed.push({ id: marker.id, ...result })
    taken = Math.max(
      taken,
      marker.x + radius,
      result.side === 'right' ? result.left + result.width : -Infinity,
    )
  })

  return placed
}

// ---- Outcomes ----

// Hours tracked on an Area within the range.
export function trackedHours(areaId, entries, range) {
  const minutes = entries
    .filter(
      (entry) =>
        entry.areaId === areaId &&
        typeof entry.start === 'string' &&
        inRange(entry.start.slice(0, 10), range),
    )
    .reduce((total, entry) => total + entryMinutes(entry), 0)
  return minutes / 60
}

// One row per active Area: its outcome, and tracked hours against three
// months of its budget.
export function outcomeRows(areas, entries, range) {
  return liveAreas(areas)
    .filter((area) => area.status === 'active')
    .map((area) => ({
      area: area,
      tracked: trackedHours(area.id, entries, range),
      budget: (area.monthlyBudgetHours ?? 0) * 3,
    }))
}
