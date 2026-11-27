/*
  areas.js — the rules for Areas.

  An Area is one thing you're involved in: a course, a project, the
  internship search. Categories (config.js) still decide the colour and
  what Google Calendar shows. Each Area sits inside one category, and
  tasks can belong to an Area.

  Each Area has a status, which is a decision you make each quarter:
    active    push it forward (aim for 5 at most)
    maintain  keep it ticking over
    paused    on purpose, not forgotten

  Like the other files in lib/, these are plain functions. They take the
  lists and hand back new ones; App decides what to keep.
*/

import { AREA_DEFAULTS } from './migrate.js'
import { toISODate } from './dates.js'

export const AREA_STATUSES = ['active', 'maintain', 'paused']

export const STATUS_NAMES = {
  active: 'Active',
  maintain: 'Maintain',
  paused: 'Paused',
}

// A new Area with every field filled in. The id and the moment are
// passed in, so tests can choose them.
export function createArea(details, id, now = new Date()) {
  return {
    ...AREA_DEFAULTS,
    ...details,
    id: id,
    name: details.name.trim(),
    createdAt: now.toISOString(),
    archived: false,
  }
}

// Changes some fields of one Area and leaves the rest alone.
export function updateArea(areas, id, changes) {
  return areas.map((area) => (area.id === id ? { ...area, ...changes } : area))
}

// Is anything still pointing at this Area? If so, deleting it would
// leave tasks and time entries with a name that can't be shown.
export function isInUse(areaId, tasks, entries) {
  return (
    tasks.some((task) => task.areaId === areaId) ||
    entries.some((entry) => entry.areaId === areaId)
  )
}

// Deleting an Area that nothing uses removes it. One that is in use is
// archived instead: hidden from pickers, but kept so its tasks and its
// history still have a name to show (greyed out).
export function removeArea(areas, id, tasks, entries) {
  if (isInUse(id, tasks, entries)) {
    return updateArea(areas, id, { archived: true })
  }

  return areas.filter((area) => area.id !== id)
}

// The Areas you can still pick: not archived, in the order you made them.
export function liveAreas(areas) {
  return areas.filter((area) => !area.archived)
}

export function findArea(areas, id) {
  return areas.find((area) => area.id === id) ?? null
}

// How many Areas are active. Above the limit is a warning, never a block:
// sometimes six things really are on at once.
export function activeCount(areas) {
  return liveAreas(areas).filter((area) => area.status === 'active').length
}

// The last day this Area got any tracked time, or null if never.
// Entries' starts are "YYYY-MM-DDTHH:MM", so the first 10 characters are
// the day, and comparing day text sorts correctly.
export function lastWorkedOn(areaId, entries) {
  let latest = null

  for (const entry of entries) {
    if (entry.areaId !== areaId || typeof entry.start !== 'string') continue
    const day = entry.start.slice(0, 10)
    if (latest === null || day > latest) latest = day
  }

  return latest
}

// Whole days between two "YYYY-MM-DD" days. Going through noon avoids the
// one-hour hiccup on the days the clocks change.
function daysBetween(from, to) {
  const toNoon = (day) => new Date(`${day}T12:00`).getTime()
  return Math.round((toNoon(to) - toNoon(from)) / 86400000)
}

// "today", "yesterday", "3d ago" or "never", for the Areas table.
export function formatLastWorked(day, now = new Date()) {
  if (day === null) return 'never'

  const ago = daysBetween(day, toISODate(now))
  if (ago <= 0) return 'today'
  if (ago === 1) return 'yesterday'
  return `${ago}d ago`
}
