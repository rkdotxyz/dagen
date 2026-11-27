/*
  capacity.js — how much time a day really has.

  The rule from the spec: hard things first, soft things fill what's left.

    free = base hours − fixed hours − planned hours

    base     your free hours that day (settings: weekday or weekend)
    fixed    fixed tasks + busy events from your Google calendars
    planned  the estimates of flexible tasks placed on that day

  Free can go below zero. That means the day is overpacked: there's more
  on it than you said you have time for.

  Away days (a trip) have no capacity at all.

  Like everything in lib/, these are plain functions over plain data.
*/

import { dayOf, timeOf } from './placement.js'
import { toMinutes, weekdayIndex } from './dates.js'

// Weekend = Saturday (5) and Sunday (6), counting Monday as 0.
export function baseHours(day, settings) {
  const weekend = weekdayIndex(day) >= 5
  return weekend ? settings.capacity.weekend : settings.capacity.weekday
}

// Is this day inside any away block? Days compare correctly as text.
export function isAway(day, away = []) {
  return away.some((block) => block.startDay <= day && day <= block.endDay)
}

// The away block covering this day, or null. Used for its title.
export function awayBlockOn(day, away = []) {
  return away.find((block) => block.startDay <= day && day <= block.endDay) ?? null
}

// Joins overlapping or touching [start, end] pairs (in minutes) so time
// is never counted twice: a fixed task 10–12 and a lecture 11–13 are
// three hours together, not four.
export function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  const merged = []

  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }

  return merged
}

// Is this something that takes fixed time? Fixed tasks, and busy events
// from your calendars (they carry external: true, see busy.js).
export function isFixedItem(item) {
  return Boolean(item.fixed || item.external)
}

// Hours taken by fixed things on a day. Done fixed tasks still count:
// a lecture you attended still used the time.
//
// A fixed task with no time ("any time" on the day) can't be merged with
// the others, so its estimate is simply added on top.
export function fixedHours(day, tasks, busyBlocks = []) {
  const items = [...tasks, ...busyBlocks].filter(
    (item) => isFixedItem(item) && dayOf(item) === day,
  )

  const intervals = []
  let untimed = 0

  for (const item of items) {
    const time = timeOf(item)
    if (time === null) {
      untimed += item.durationMin
      continue
    }
    const start = toMinutes(time)
    // Clipped at midnight: whatever runs past it belongs to tomorrow.
    intervals.push([start, Math.min(start + item.durationMin, 24 * 60)])
  }

  const minutes = mergeIntervals(intervals).reduce(
    (total, [start, end]) => total + (end - start),
    untimed,
  )
  return minutes / 60
}

// Hours of flexible work planned on a day: placed tasks that aren't
// fixed and aren't done yet.
export function plannedHours(day, tasks) {
  const minutes = tasks
    .filter(
      (task) =>
        !isFixedItem(task) && task.status !== 'done' && dayOf(task) === day,
    )
    .reduce((total, task) => total + task.durationMin, 0)
  return minutes / 60
}

// Everything about one day's capacity, in one object.
export function daySummary(day, { tasks, busy = [], settings, away = [] }) {
  const awayBlock = awayBlockOn(day, away)
  const base = awayBlock ? 0 : baseHours(day, settings)
  const fixed = fixedHours(day, tasks, busy)
  const planned = plannedHours(day, tasks)

  return {
    day: day,
    away: awayBlock,
    base: base,
    fixed: fixed,
    planned: planned,
    // Away means zero, whatever is on it: the lid is on.
    free: awayBlock ? 0 : base - fixed - planned,
  }
}

export function freeHours(day, context) {
  return daySummary(day, context).free
}

// A run of days, totalled. Used by the week here and the month later.
function summarise(days, context) {
  const perDay = days.map((day) => daySummary(day, context))
  const sum = (key) => perDay.reduce((total, summary) => total + summary[key], 0)

  return {
    days: perDay,
    base: sum('base'),
    fixed: sum('fixed'),
    planned: sum('planned'),
    free: sum('free'),
    // Overpacked means free below zero. A tiny negative from rounding
    // (minutes / 60) isn't worth a warning.
    overpacked: perDay.filter((summary) => summary.free < -0.01),
  }
}

export function weekSummary(weekDaysList, context) {
  return summarise(weekDaysList, context)
}

export function monthSummary(monthDaysList, context) {
  return summarise(monthDaysList, context)
}
