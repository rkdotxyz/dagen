/*
  placement.js — where a task sits in time, if anywhere.

  Until Phase 11 every task had a start, so the whole app could call
  splitStart(task.start) and get a day back. Now a task is in exactly one
  of three states:

    timed     start "2026-11-27T13:00"   day "2026-11-27"   on the grid
    anytime   start null                 day "2026-11-27"   "Any time" that day
    unplaced  start null                 day null           the "To place" list

  Everything that needs a task's day asks these helpers instead of
  reading start directly, because start can now be null and splitStart
  would crash on it.
*/

import { splitStart } from './dates.js'

export function placementOf(task) {
  if (task.start) return 'timed'
  if (task.day) return 'anytime'
  return 'unplaced'
}

// The day a task is on, or null when it hasn't been given one.
// A timed task's day is read from its start, which is the source of
// truth: if the two ever disagreed, the time on the clock wins.
export function dayOf(task) {
  if (task.start) return splitStart(task.start).day
  return task.day ?? null
}

// The start time ("14:30") of a timed task, or null for the other two.
export function timeOf(task) {
  return task.start ? splitStart(task.start).time : null
}

// Keeps day in step with start after any change that sets start, so a
// saved task always agrees with itself. Returns the same object when
// nothing needed fixing, which saves React a redraw.
export function withDay(task) {
  if (!task.start) return task

  const day = splitStart(task.start).day
  return task.day === day ? task : { ...task, day: day }
}
