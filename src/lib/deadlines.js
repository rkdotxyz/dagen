/*
  deadlines.js — warnings that come BEFORE the deadline, not on it.

  A task can have a deadline (due, a day). From its estimate Dagen works
  out a "start by" day:

    start by = due − (ceil(estimate / hours per day) + buffer) days

  With 2 hours a day and 1 day of buffer (config.js), a 5-hour task due
  Friday 11 Dec should be started by Monday 7 Dec.

  Then each task with a deadline is in one of these states:
    overdue    the due day has passed
    start-now  the start-by day has come
    upcoming   there's still time
    none       no deadline, or it's done
*/

import { HOURS_PER_DAY_ON_TASK, START_BUFFER_DAYS } from '../config.js'
import { addDays, formatShortDay } from './dates.js'

export function startBy(task) {
  if (!task.due) return null

  const workDays = Math.ceil(task.durationMin / (HOURS_PER_DAY_ON_TASK * 60))
  return addDays(task.due, -(workDays + START_BUFFER_DAYS))
}

export function deadlineState(task, today) {
  if (!task.due || task.status === 'done') return 'none'
  if (task.due < today) return 'overdue'
  if (startBy(task) <= today) return 'start-now'
  return 'upcoming'
}

// The words on the little pill: "overdue", "start now", "start by Thu 3 Dec".
// null when there's nothing to say.
export function deadlineLabel(task, today) {
  const state = deadlineState(task, today)
  if (state === 'overdue') return 'overdue'
  if (state === 'start-now') return 'start now'
  if (state === 'upcoming') return `start by ${formatShortDay(startBy(task))}`
  return null
}
