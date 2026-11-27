/*
  month.js — the rules behind the Month screen.

  Three jobs:
    1. The calendar grid: whole Monday-to-Sunday weeks covering the month,
       with the edges of the months either side.
    2. What each day's cell says: at most two short labels, chosen from
       deadlines ("Due: Essay"), one-off fixed events and priorities.
       Anything that repeats every week (chores, lectures) is left out,
       or every cell would say the same thing.
    3. The monthly hour budgets: do the Areas' budgets fit in the time the
       month actually has?

  The month's capacity itself comes from capacity.js (monthSummary).
*/

import { addDays, formatHours, monthDays, startOfWeek } from './dates.js'
import { dayOf } from './placement.js'
import { entryMinutes } from './timer.js'

// The most labels a cell shows. More than that becomes "+2 more".
export const MAX_CELL_LABELS = 2

// "December 2026" for a day in it.
export function monthName(day, withYear = false) {
  const [year, month] = day.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

// The first day of the month a day is in: "2026-11-27" -> "2026-11-01".
export function startOfMonth(day) {
  return `${day.slice(0, 7)}-01`
}

// Moves to the same month n months away, always landing on the 1st so
// there's no "31 February" problem.
export function shiftMonth(day, amount) {
  const [year, month] = day.split('-').map(Number)
  const moved = new Date(year, month - 1 + amount, 1)
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}-01`
}

// The weeks to draw: from the Monday on or before the 1st to the Sunday
// on or after the last day. A list of weeks, each a list of 7 days.
export function monthGrid(day) {
  const days = monthDays(day)
  const first = startOfWeek(days[0])
  const last = addDays(startOfWeek(days[days.length - 1]), 6)

  const weeks = []
  for (let monday = first; monday <= last; monday = addDays(monday, 7)) {
    weeks.push([0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset)))
  }
  return weeks
}

// The Mondays of every week the month touches: the weeks of busy
// calendar events the Month screen needs.
export function monthWeekStarts(day) {
  return monthGrid(day).map((week) => week[0])
}

// The short labels for one day's cell, most important first:
//   1. deadlines due that day ("Due: Essay"), not done
//   2. one-off fixed things: fixed tasks not made by a weekly rule, and
//      busy events that aren't part of a repeating series
//   3. priority tasks placed that day
// Returns { labels: [...at most two], more: how many didn't fit }.
export function cellLabels(day, tasks, busy = []) {
  const due = tasks
    .filter((task) => task.due === day && task.status !== 'done')
    .map((task) => ({ id: `due:${task.id}`, kind: 'due', text: `Due: ${task.title}` }))

  const oneOff = [
    ...tasks.filter((task) => task.fixed && !task.templateId && dayOf(task) === day),
    ...busy.filter((event) => !event.recurring && dayOf(event) === day),
  ].map((item) => ({ id: `fixed:${item.id}`, kind: 'fixed', text: item.title }))

  const priorities = tasks
    .filter(
      (task) =>
        task.priority && !task.fixed && task.status !== 'done' && dayOf(task) === day,
    )
    .map((task) => ({ id: `priority:${task.id}`, kind: 'priority', text: task.title }))

  const all = [...due, ...oneOff, ...priorities]
  return { labels: all.slice(0, MAX_CELL_LABELS), more: Math.max(0, all.length - MAX_CELL_LABELS) }
}

// The Month screen's headline: "3 overpacked days in December", or
// "December has 84h free" (rounded down to whole hours).
export function monthHeadline(summary, day) {
  const name = monthName(day)
  const over = summary.overpacked.length
  if (over === 1) return `1 overpacked day in ${name}`
  if (over > 1) return `${over} overpacked days in ${name}`
  return `${name} has ${Math.floor(Math.max(summary.free, 0))}h free`
}

// How many deadlines fall in the month (not done yet).
export function deadlinesIn(day, tasks) {
  const month = day.slice(0, 7)
  return tasks.filter((task) => task.due?.slice(0, 7) === month && task.status !== 'done').length
}

// Hours tracked in the month so far, from time entries.
export function trackedHoursIn(day, entries) {
  const month = day.slice(0, 7)
  const minutes = entries
    .filter((entry) => typeof entry.start === 'string' && entry.start.slice(0, 7) === month)
    .reduce((total, entry) => total + entryMinutes(entry), 0)
  return minutes / 60
}

// "62h planned · 4 deadlines · 18.5h tracked"
export function monthSubline(summary, deadlines, tracked) {
  return [
    `${formatHours(summary.planned)} planned`,
    `${deadlines} ${deadlines === 1 ? 'deadline' : 'deadlines'}`,
    `${formatHours(tracked)} tracked`,
  ].join(' · ')
}

// ---- Budgets ----

// The Areas that get a budget row: not paused, not archived.
export function budgetAreas(areas) {
  return areas.filter((area) => !area.archived && area.status !== 'paused')
}

// Do the budgets fit? The room is the month's hours after fixed time,
// added up day by day: each day gives (base − fixed), never below zero.
// Day by day matters: a lecture on a day you're away takes nothing from
// a day that had no hours to begin with.
//
// Planned tasks aren't taken off: budgets are the plan for all flexible
// work, so planned tasks are part of them, not extra.
//
// Returns { total, room, difference, over, message }.
export function budgetRoom(summary) {
  return summary.days.reduce((sum, day) => sum + Math.max(0, day.base - day.fixed), 0)
}

export function budgetCheck(areas, summary) {
  const total = budgetAreas(areas).reduce(
    (sum, area) => sum + (area.monthlyBudgetHours ?? 0),
    0,
  )
  const room = Math.floor(budgetRoom(summary))
  const difference = Math.round(total - room)

  if (difference > 0) {
    return {
      total: total,
      room: room,
      difference: difference,
      over: true,
      message: `Over by ${difference}h. Lower a budget or pause an Area.`,
    }
  }

  return {
    total: total,
    room: room,
    difference: difference,
    over: false,
    message:
      difference === 0
        ? 'Every hour is budgeted. Keep some slack.'
        : `${-difference}h unbudgeted. Keep some slack.`,
  }
}

// A budget nudged by − or +, in whole hours, never below zero.
export function nudgedBudget(area, step) {
  return Math.max(0, Math.round((area.monthlyBudgetHours ?? 0) + step))
}
