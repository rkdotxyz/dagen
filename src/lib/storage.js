/*
  storage.js — saves and loads what the app needs to remember.

  Two things now: the tasks, and which category sections you collapsed.
  They're kept under separate keys so one can't damage the other.

  In a later phase this file will talk to a cloud database instead, and
  nothing else in the app will need to change.
*/

import { CATEGORIES, DEFAULT_CATEGORY_ID } from '../config.js'
import { makeStart, todayISO } from './dates.js'

const TASKS_KEY = 'dagen.tasks.v1'
const COLLAPSED_KEY = 'dagen.collapsed.v1'

// Old saves are brought up to date as they load. This is a "migration":
// old data, new shape. Two of them now:
//
//   1. Phase 1 tasks have no categoryId (categories didn't exist), and a
//      task can point at a category you later renamed in config.js.
//      Either way it gets the default category, so it can't vanish.
//   2. Tasks saved before this phase have no time at all. Rather than
//      guess silently, they're put at 09:00 today for half an hour AND
//      marked tentative, which is exactly what tentative means: a time
//      that needs a second look.
function migrate(task) {
  const known = CATEGORIES.some((category) => category.id === task.categoryId)
  const withCategory = known
    ? task
    : { ...task, categoryId: DEFAULT_CATEGORY_ID }

  if (withCategory.start) return withCategory

  return {
    ...withCategory,
    start: makeStart(todayISO(), '09:00'),
    durationMin: 30,
    tentative: true,
  }
}

export function loadTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    // Someone could have put anything in storage. Only accept a real list.
    if (!Array.isArray(parsed)) return []

    return parsed.map(migrate)
  } catch {
    // Blocked storage or damaged text: start empty rather than crash.
    return []
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full or switched off: the app still works, it just forgets.
  }
}

// The collapsed sections are stored as a list of category ids,
// e.g. ["chores", "social"].
export function loadCollapsed() {
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCollapsed(categoryIds) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(categoryIds))
  } catch {
    // Same as above: forgetting which sections were folded is harmless.
  }
}
