/*
  storage.js — saves and loads what the app needs to remember.

  Five things now: the tasks, which category sections you collapsed, your
  recurring chore templates, the days you deleted a chore on, and what has
  been sent to Google Calendar. Each has its own key, so one can't damage
  another.

  Three of them are plain lists and share one pair of helpers. The last is
  a lookup from task id to event, so it gets its own pair.

  In a later phase this file will talk to a cloud database instead, and
  nothing else in the app will need to change.
*/

import { CATEGORIES, DEFAULT_CATEGORY_ID } from '../config.js'
import { makeStart, todayISO } from './dates.js'

const TASKS_KEY = 'dagen.tasks.v1'
const COLLAPSED_KEY = 'dagen.collapsed.v1'
const TEMPLATES_KEY = 'dagen.templates.v1'
const SKIPPED_KEY = 'dagen.skipped.v1'
const SENT_KEY = 'dagen.calendar.v1'

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

// ---- plain lists ----
//
// Written once, used three times. Anything that goes wrong (nothing
// saved, blocked storage, damaged text) comes back as an empty list, so
// the app always starts.
function loadList(key) {
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Storage full or switched off: harmless for all three of these.
  }
}

// The ids of the folded category sections, e.g. ["chores", "social"].
export function loadCollapsed() {
  return loadList(COLLAPSED_KEY)
}

export function saveCollapsed(categoryIds) {
  saveList(COLLAPSED_KEY, categoryIds)
}

// The recurring chore rules, e.g. "Cook, daily, 18:00, 1h".
export function loadTemplates() {
  return loadList(TEMPLATES_KEY)
}

export function saveTemplates(templates) {
  saveList(TEMPLATES_KEY, templates)
}

// "templateId:day" for every chore you deleted on a particular day, so
// it isn't made again next time you open that day.
export function loadSkipped() {
  return loadList(SKIPPED_KEY)
}

export function saveSkipped(keys) {
  saveList(SKIPPED_KEY, keys)
}

// What Google Calendar already knows: { taskId: { eventId, signature } }.
// An object rather than a list, because it's looked up by task id.
export function loadSent() {
  try {
    const saved = localStorage.getItem(SENT_KEY)
    if (!saved) return {}

    const parsed = JSON.parse(saved)
    // typeof null is also "object", so check for null separately.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveSent(sent) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent))
  } catch {
    // Worst case Dagen forgets what it sent and makes the events again.
  }
}
