/*
  storage.js — saves and loads what the app needs to remember.

  Each thing has its own key, so one can't damage another: the tasks,
  folded sections, recurring chore rules, the days you deleted a chore
  on, what has been sent to Google Calendar, and since Phase 11 your
  Areas, time entries, the running timer, away blocks and settings.

  The plain lists share one pair of helpers. Things with their own shape
  (the Google record, settings, the timer) get their own pair.

  How old saves are brought up to date lives in migrate.js, shared with
  the cloud, so a task looks the same wherever it was loaded from.
*/

import {
  migrateArea,
  migrateSettings,
  migrateTask,
  migrateTimer,
  onlyObjects,
} from './migrate.js'

const TASKS_KEY = 'dagen.tasks.v1'
const COLLAPSED_KEY = 'dagen.collapsed.v1'
const TEMPLATES_KEY = 'dagen.templates.v1'
const SKIPPED_KEY = 'dagen.skipped.v1'
const SENT_KEY = 'dagen.calendar.v1'
const SYNCED_AT_KEY = 'dagen.syncedAt.v1'
const CALENDAR_IDS_KEY = 'dagen.busyCalendars.v1'
const AREAS_KEY = 'dagen.areas.v1'
const ENTRIES_KEY = 'dagen.entries.v1'
const TIMER_KEY = 'dagen.timer.v1'
const AWAY_KEY = 'dagen.away.v1'
const SETTINGS_KEY = 'dagen.settings.v1'

export function loadTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    // Someone could have put anything in storage. Only accept a real list.
    if (!Array.isArray(parsed)) return []

    // onlyObjects drops anything that isn't a task-shaped object first.
    return onlyObjects(parsed).map(migrateTask)
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
// Written once, used many times. Anything that goes wrong (nothing
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
    // Storage full or switched off: the app keeps working, it just forgets.
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

// When Dagen last asked Google what had changed. A plain timestamp, so
// it gets its own tiny pair rather than the JSON helpers.
export function loadSyncedAt() {
  try {
    return localStorage.getItem(SYNCED_AT_KEY)
  } catch {
    return null
  }
}

export function saveSyncedAt(moment) {
  try {
    localStorage.setItem(SYNCED_AT_KEY, moment)
  } catch {
    // Then Dagen asks for a longer stretch next time: slower, not wrong.
  }
}

// Which calendars count as "busy" for the conflict check.
export function loadBusyCalendars() {
  return loadList(CALENDAR_IDS_KEY)
}

export function saveBusyCalendars(ids) {
  saveList(CALENDAR_IDS_KEY, ids)
}

// ---- Phase 11: Areas, time and settings ----

// The things you're involved in. See areas.js.
export function loadAreas() {
  return onlyObjects(loadList(AREAS_KEY)).map(migrateArea)
}

export function saveAreas(areas) {
  saveList(AREAS_KEY, areas)
}

// Tracked time. Nothing makes these until Phase 13, but they're loaded
// and saved from now on so a save from a newer version is never lost.
export function loadEntries() {
  return onlyObjects(loadList(ENTRIES_KEY))
}

export function saveEntries(entries) {
  saveList(ENTRIES_KEY, entries)
}

// Days you're away, when you have no capacity at all (Phase 15).
export function loadAway() {
  return onlyObjects(loadList(AWAY_KEY))
}

export function saveAway(blocks) {
  saveList(AWAY_KEY, blocks)
}

// Reads one saved JSON value, or null if there's none or it's damaged.
function loadValue(key) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // As with the lists: forgetting is better than crashing.
  }
}

// The one running timer, or null. Kept even across a reload (Phase 13).
export function loadTimer() {
  return migrateTimer(loadValue(TIMER_KEY))
}

export function saveTimer(timer) {
  saveValue(TIMER_KEY, timer)
}

// Free hours per day, the active Area limit and rollover. Always comes
// back complete: migrateSettings fills in anything missing.
export function loadSettings() {
  return migrateSettings(loadValue(SETTINGS_KEY))
}

export function saveSettings(settings) {
  saveValue(SETTINGS_KEY, settings)
}

// ---- Phase 12: small things the screens remember ----

const TAB_KEY = 'dagen.tab.v1'
const ROLLOVER_ASKED_KEY = 'dagen.rolloverAsked.v1'

// The last screen you were on, so the installed app reopens there even
// when it starts without "#week" in its address.
export function loadTab() {
  try {
    return localStorage.getItem(TAB_KEY)
  } catch {
    return null
  }
}

export function saveTab(tab) {
  try {
    localStorage.setItem(TAB_KEY, tab)
  } catch {
    // Then it opens on Day next time. Harmless.
  }
}

// The day you last answered the rollover question ("Move them" or "Not
// now"), so it's asked at most once a day.
export function loadRolloverAsked() {
  try {
    return localStorage.getItem(ROLLOVER_ASKED_KEY)
  } catch {
    return null
  }
}

export function saveRolloverAsked(day) {
  try {
    localStorage.setItem(ROLLOVER_ASKED_KEY, day)
  } catch {
    // Then it may ask again today. Harmless.
  }
}
