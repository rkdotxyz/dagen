/*
  storage.js — saves and loads what the app needs to remember.

  Two things now: the tasks, and which category sections you collapsed.
  They're kept under separate keys so one can't damage the other.

  In a later phase this file will talk to a cloud database instead, and
  nothing else in the app will need to change.
*/

import { CATEGORIES, DEFAULT_CATEGORY_ID } from '../config.js'

const TASKS_KEY = 'dagen.tasks.v1'
const COLLAPSED_KEY = 'dagen.collapsed.v1'

// Tasks saved in Phase 1 have no categoryId, because categories didn't
// exist yet, and a task can point at a category you later renamed or
// removed in config.js. Either way, give it the default category as it's
// loaded so it can't vanish. This is a "migration": old data, new shape.
function withCategory(task) {
  const exists = CATEGORIES.some((category) => category.id === task.categoryId)
  return exists ? task : { ...task, categoryId: DEFAULT_CATEGORY_ID }
}

export function loadTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    // Someone could have put anything in storage. Only accept a real list.
    if (!Array.isArray(parsed)) return []

    return parsed.map(withCategory)
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
