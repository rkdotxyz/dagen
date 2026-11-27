/*
  planning.js — the rules behind the Week screen.

  What counts as this week's priorities, the order of the To place list,
  what "Halve it" does, and the sentences at the top of each screen. The
  screens only draw what these return.

  Headlines state the finding, not the topic: "Thursday is overpacked",
  rather than "Week overview".
*/

import { MAX_PRIORITIES } from '../config.js'
import { addDays, formatHours, isoWeek, weekdayName, formatDayRange } from './dates.js'
import { startBy } from './deadlines.js'
import { dayOf, placementOf } from './placement.js'

// This week's priorities, at most five:
//   - flexible priority tasks placed this week, or due within 14 days
//   - fixed priority events in the next 14 days
// Done ones drop off. Sorted by the day that matters most for each:
// its day if placed, otherwise its deadline.
export function weekPriorities(tasks, weekDaysList, today) {
  const first = weekDaysList[0]
  const last = weekDaysList[weekDaysList.length - 1]
  const soon = addDays(today, 14)

  const picked = tasks.filter((task) => {
    if (!task.priority || task.status === 'done') return false

    const day = dayOf(task)
    if (task.fixed) return day !== null && day >= today && day <= soon

    const placedThisWeek = day !== null && day >= first && day <= last
    const dueSoon = task.due !== null && task.due !== undefined && task.due <= soon
    return placedThisWeek || dueSoon
  })

  const keyDay = (task) => dayOf(task) ?? task.due ?? '9999-12-31'

  return picked
    .sort((a, b) => (keyDay(a) < keyDay(b) ? -1 : keyDay(a) > keyDay(b) ? 1 : 0))
    .slice(0, MAX_PRIORITIES)
}

// The To place list: unplaced and not done, in the order you should deal
// with them. Earliest start-by first (no deadline goes last), then
// priority ones, then the most-pushed.
export function toPlaceList(tasks) {
  const byStartBy = (task) => startBy(task) ?? '9999-12-31'

  return tasks
    .filter((task) => placementOf(task) === 'unplaced' && task.status !== 'done')
    .sort((a, b) => {
      if (byStartBy(a) !== byStartBy(b)) return byStartBy(a) < byStartBy(b) ? -1 : 1
      if (Boolean(a.priority) !== Boolean(b.priority)) return a.priority ? -1 : 1
      return (b.rolled ?? 0) - (a.rolled ?? 0)
    })
}

// "Halve it": half the estimate, kept to quarter hours and at least 15
// minutes, and a fresh start on the pushed count.
export function halved(task) {
  const half = Math.max(15, Math.round(task.durationMin / 2 / 15) * 15)
  return { durationMin: half, rolled: 0 }
}

// The changes that put a task on a day with no time ("any time").
export function placeOn(day) {
  return { day: day, start: null }
}

// How many clashing pairs there are among these items. conflictsById
// lists each clash from both sides, so the total is halved.
export function clashCount(conflicts, itemIds) {
  let sides = 0
  for (const id of itemIds) sides += conflicts[id]?.length ?? 0
  return Math.round(sides / 2)
}

// "Thursday", "Thursday and Friday", "3 days".
function namesOf(days) {
  if (days.length === 1) return weekdayName(days[0])
  if (days.length === 2) return `${weekdayName(days[0])} and ${weekdayName(days[1])}`
  return `${days.length} days`
}

// The Week screen's headline.
//   "Week 48 has 6h of slack"
//   "Thursday is overpacked", "Thursday and Friday are overpacked"
//   "Week 48 has no slack" (exactly full)
export function weekHeadline(summary) {
  const week = isoWeek(summary.days[0].day)
  const overpacked = summary.overpacked.map((item) => item.day)

  if (overpacked.length > 0) {
    return `${namesOf(overpacked)} ${overpacked.length === 1 ? 'is' : 'are'} overpacked`
  }

  // Slack = free time across the days that have some. Rounded down to
  // the half hour, so it never promises more than there is.
  const slack = Math.floor(Math.max(summary.free, 0) * 2) / 2
  if (slack === 0) return `Week ${week} has no slack`
  return `Week ${week} has ${formatHours(slack)} of slack`
}

// The line under it: "23 Nov – 29 Nov · 12h fixed · 20.5h planned · 1 clash"
export function weekSubline(summary, clashes) {
  const first = summary.days[0].day
  const last = summary.days[summary.days.length - 1].day

  return [
    formatDayRange(first, last),
    `${formatHours(summary.fixed)} fixed`,
    `${formatHours(summary.planned)} planned`,
    `${clashes} ${clashes === 1 ? 'clash' : 'clashes'}`,
  ].join(' · ')
}

// The Day screen's headline: "Friday is overpacked by 0.5h",
// "Friday · 3h free", or "Friday · away".
export function dayHeadline(summary) {
  const name = weekdayName(summary.day)
  if (summary.away) return `${name} · away`
  if (summary.free < -0.01) return `${name} is overpacked by ${formatHours(-summary.free)}`
  return `${name} · ${formatHours(Math.max(summary.free, 0))} free`
}

// A day card's short note: "3.5h free" or "over 2h".
export function freeNote(summary) {
  if (summary.away) return 'away'
  if (summary.free < -0.01) return `over ${formatHours(-summary.free)}`
  return `${formatHours(Math.max(summary.free, 0))} free`
}
