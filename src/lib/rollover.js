/*
  rollover.js — unfinished work comes back, and is counted.

  A flexible task that was placed on a past day and didn't get done goes
  back to "To place", and its "pushed" count goes up by one. Seeing
  "pushed 3×" is the nudge to halve it or drop it.

  Three kinds never roll over:
    - done tasks, obviously
    - fixed tasks: a lecture that happened at 10:00 can't move
    - recurring chores (templateId): a missed dinner is just missed

  RK chose a morning PROMPT rather than doing this silently, so there are
  two functions: one that says which tasks would move (for the question),
  and one that moves them (when you say yes).
*/

import { dayOf } from './placement.js'

// Would this task roll over today?
export function shouldRollOver(task, today) {
  if (task.status === 'done' || task.fixed || task.templateId) return false

  const day = dayOf(task)
  return day !== null && day < today
}

// The tasks that would move. The prompt counts these.
export function rolloverCandidates(tasks, today) {
  return tasks.filter((task) => shouldRollOver(task, today))
}

// Moves them: unplaced, and pushed once more. Returns the SAME array when
// nothing moves, so React has no reason to redraw.
export function rollOver(tasks, today) {
  if (!tasks.some((task) => shouldRollOver(task, today))) return tasks

  return tasks.map((task) =>
    shouldRollOver(task, today)
      ? { ...task, start: null, day: null, rolled: (task.rolled ?? 0) + 1 }
      : task,
  )
}
