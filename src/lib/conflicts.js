/*
  conflicts.js — the overlap rule.

  Dagen never stops you double-booking; it just tells you. Everything
  here is a plain function over a list of tasks, so the same rule will
  work in Phase 9 when Google Calendar events join the list.
*/

import { splitStart, toMinutes } from './dates.js'

// Two tasks overlap when EACH ONE STARTS BEFORE THE OTHER ENDS.
// Back-to-back is fine: 10:00-11:00 and 11:00-12:00 don't overlap,
// because the second starts exactly when the first ends.
export function overlaps(a, b) {
  const first = splitStart(a.start)
  const second = splitStart(b.start)

  // Different days can't clash.
  if (first.day !== second.day) return false

  const aStart = toMinutes(first.time)
  const aEnd = aStart + a.durationMin
  const bStart = toMinutes(second.time)
  const bEnd = bStart + b.durationMin

  return aStart < bEnd && bStart < aEnd
}

// Everything in the list that clashes with this task.
// A task never clashes with itself, and finished tasks don't block
// anything: if Laundry is already done, its slot is free.
export function findConflicts(task, tasks) {
  if (task.status === 'done') return []

  return tasks.filter(
    (other) =>
      other.id !== task.id && other.status !== 'done' && overlaps(task, other),
  )
}

// One pass over the whole list: { taskId: [the tasks it clashes with] }.
// Tasks with no clash simply aren't in the object, so the rows can ask
// "is my id in here?" without a second search.
export function conflictsById(tasks) {
  const result = {}

  for (const task of tasks) {
    const found = findConflicts(task, tasks)
    if (found.length > 0) result[task.id] = found
  }

  return result
}
