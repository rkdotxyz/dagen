/*
  timer.js — one timer, and the time entries it leaves behind.

  The rules from the spec:
    - Only one timer runs. Starting a task stops whatever was running.
    - Every stop saves exactly one time entry...
    - ...unless the timer ran for under a minute: that was a mis-tap, so
      it's thrown away (and the screen says so).
    - Forgotten time can be logged by hand, and a block that happened as
      planned can be logged in one tap ("Log as planned").

  The timer and the entries travel together as "state":
    { activeTimer, entries }
  activeTimer is { taskId, areaId, categoryId, label, startedAt } or null.
  startedAt is a full moment ("2026-11-27T12:02:11.000Z"), so a timer
  survives a reload and still knows exactly when it began.

  An entry is
    { id, taskId, areaId, categoryId, label, start, end, source }
  with start and end as "2026-11-27T13:02", local time like tasks, and
  source "timer", "manual" or "as-planned". The category is copied in when
  the entry is made, so it still counts later if the task is deleted.

  Every function takes the moment as "now", so tests can choose it.
*/

import { DEFAULT_CATEGORY_ID } from '../config.js'
import { shiftStart, toStart } from './dates.js'
import { dayOf } from './placement.js'

// Shorter than this, a stop is a mis-tap and nothing is saved.
export const MIN_ENTRY_MS = 60 * 1000

// What a timer for this task should carry.
export function timerFor(task) {
  return {
    taskId: task.id,
    areaId: task.areaId ?? null,
    categoryId: task.categoryId ?? DEFAULT_CATEGORY_ID,
    label: task.title,
  }
}

// Stops the running timer, if any.
// Returns the new state, the entry it made (or null), and whether a too
// short run was thrown away.
export function stopTimer(state, now = new Date()) {
  const timer = state.activeTimer
  if (!timer) return { state: state, entry: null, discarded: false }

  const started = new Date(timer.startedAt)
  const stopped = { ...state, activeTimer: null }

  if (now - started < MIN_ENTRY_MS) {
    return { state: stopped, entry: null, discarded: true }
  }

  const entry = {
    // One timer at a time, so its start moment is a unique id.
    id: `e_${started.getTime().toString(36)}`,
    taskId: timer.taskId ?? null,
    areaId: timer.areaId ?? null,
    categoryId: timer.categoryId ?? DEFAULT_CATEGORY_ID,
    label: timer.label,
    start: toStart(started),
    end: toStart(now),
    source: 'timer',
  }

  return {
    state: { ...stopped, entries: [...state.entries, entry] },
    entry: entry,
    discarded: false,
  }
}

// Starts a timer for "what" ({ taskId, areaId, categoryId, label }).
// Whatever was running is stopped first, and saved as usual.
export function startTimer(state, what, now = new Date()) {
  const stopped = stopTimer(state, now)

  return {
    ...stopped,
    state: {
      ...stopped.state,
      activeTimer: {
        taskId: what.taskId ?? null,
        areaId: what.areaId ?? null,
        categoryId: what.categoryId ?? DEFAULT_CATEGORY_ID,
        label: what.label,
        startedAt: now.toISOString(),
      },
    },
  }
}

// How long the timer has run, in whole seconds (never negative, even if
// another device's clock is a little ahead).
export function elapsedSeconds(timer, now = new Date()) {
  return Math.max(0, Math.floor((now - new Date(timer.startedAt)) / 1000))
}

// 3725 -> "01:02:05", the Now bar's clock.
export function formatClock(seconds) {
  const pad = (number) => String(number).padStart(2, '0')
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`
}

// An entry made from a timed task exactly as it was planned.
export function logAsPlanned(task, id = `e_${task.id}_${dayOf(task)}`) {
  return {
    id: id,
    taskId: task.id,
    areaId: task.areaId ?? null,
    categoryId: task.categoryId ?? DEFAULT_CATEGORY_ID,
    label: task.title,
    start: task.start,
    end: shiftStart(task.start, task.durationMin),
    source: 'as-planned',
  }
}

// Does this task already have time logged on this day? Then "Log as
// planned" isn't offered again.
export function isLogged(task, day, entries) {
  return entries.some(
    (entry) => entry.taskId === task.id && typeof entry.start === 'string' && entry.start.slice(0, 10) === day,
  )
}

// Is this a block that's over, with nothing logged? Those get the "Log as
// planned" button. Only timed tasks have a planned slot to copy.
export function canLogAsPlanned(task, entries, now = new Date()) {
  if (!task.start || task.external) return false
  const end = shiftStart(task.start, task.durationMin)
  return end <= toStart(now) && !isLogged(task, dayOf(task), entries)
}

// What "Resume last" restarts: the most recently ended entry, or null.
export function lastEntry(entries) {
  let latest = null
  for (const entry of entries) {
    if (typeof entry.end !== 'string') continue
    if (latest === null || entry.end > latest.end) latest = entry
  }
  return latest
}

// The entries of one day, earliest first. An entry belongs to the day it
// started on.
export function entriesOn(day, entries) {
  return entries
    .filter((entry) => typeof entry.start === 'string' && entry.start.slice(0, 10) === day)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
}

// An entry's length in minutes. Entries are stored to the minute, and an
// end before the start (crossing midnight) wraps to the next day.
export function entryMinutes(entry) {
  const minutes = (start) => {
    const [day, time] = start.split('T')
    const [hours, mins] = time.split(':').map(Number)
    return { day: day, total: hours * 60 + mins }
  }
  const from = minutes(entry.start)
  const to = minutes(entry.end)
  const days = Math.round(
    (new Date(`${to.day}T12:00`) - new Date(`${from.day}T12:00`)) / 86400000,
  )
  return days * 1440 + to.total - from.total
}

// Checks a hand-logged entry. Returns the problem in words, or null.
export function entryProblem({ label, areaId, start, end }) {
  if (!label.trim() && !areaId) return 'Add what you worked on, or pick an Area.'
  if (!start || !end) return 'Add a start and an end time.'
  if (end <= start) return 'The end must be after the start.'
  return null
}
