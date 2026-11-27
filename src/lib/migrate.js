/*
  migrate.js — old saves, new shape.

  A "migration" brings data saved by an older version of Dagen up to
  date as it loads. Both places data comes from use these: storage.js
  (this device) and cloud.js (your row in Supabase). Keeping them in one
  file means the two can never disagree about what a task looks like.

  The rule since Phase 11: every new field is optional with a safe
  default, so an old save loads with nothing lost and nothing guessed.
*/

import { CATEGORIES, DEFAULT_CATEGORY_ID } from '../config.js'
import { makeStart, todayISO } from './dates.js'
import { withDay } from './placement.js'

// The fields Phase 11 added to every task, and what an old task gets.
export const TASK_DEFAULTS = {
  day: null,
  areaId: null,
  fixed: false,
  due: null,
  priority: false,
  rolled: 0,
  doneAt: null,
}

// Brings one task up to date. Three steps, oldest first:
//
//   1. Phase 1 tasks have no categoryId, and a task can point at a
//      category you later renamed in config.js. Either way it gets the
//      default category, so it can't vanish.
//   2. Tasks saved before Phase 4 have no time at all. They're put at
//      09:00 today for half an hour AND marked tentative: a time that
//      needs a second look. Only tasks from before Phase 11 get this
//      (they have no "day" field yet). A newer task with no start is
//      unplaced ON PURPOSE and must stay that way.
//   3. Phase 11's fields are filled in with their defaults, and day is
//      read from start.
export function migrateTask(task) {
  const known = CATEGORIES.some((category) => category.id === task.categoryId)
  let next = known ? task : { ...task, categoryId: DEFAULT_CATEGORY_ID }

  // "in" asks whether the key exists at all, even when it holds null.
  const beforePhase11 = !('day' in next)
  if (beforePhase11 && !next.start) {
    next = {
      ...next,
      start: makeStart(todayISO(), '09:00'),
      durationMin: 30,
      tentative: true,
    }
  }

  // Spreading the defaults FIRST means any value the task already has
  // wins; only the missing ones are filled in.
  return withDay({ ...TASK_DEFAULTS, start: null, ...next })
}

// What a brand-new planner starts with. Hours are free hours per day,
// before fixed events take their share (Phase 12 does that maths).
export const DEFAULT_SETTINGS = {
  capacity: { weekday: 8, weekend: 4 },
  activeAreaLimit: 5,
  rolloverEnabled: true,
}

// Settings saved by an older version may be missing a field, or have a
// broken one. Each field is checked on its own so one bad value can't
// throw away the rest.
export function migrateSettings(saved) {
  const isObject = saved && typeof saved === 'object' && !Array.isArray(saved)
  const value = isObject ? saved : {}
  const capacity = value.capacity && typeof value.capacity === 'object' ? value.capacity : {}

  // A number, and not a negative one; anything else gets the default.
  const hours = (input, fallback) =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : fallback

  return {
    capacity: {
      weekday: hours(capacity.weekday, DEFAULT_SETTINGS.capacity.weekday),
      weekend: hours(capacity.weekend, DEFAULT_SETTINGS.capacity.weekend),
    },
    activeAreaLimit: hours(value.activeAreaLimit, DEFAULT_SETTINGS.activeAreaLimit),
    rolloverEnabled:
      typeof value.rolloverEnabled === 'boolean'
        ? value.rolloverEnabled
        : DEFAULT_SETTINGS.rolloverEnabled,
  }
}

// The fields every Area has. See areas.js for what they mean.
export const AREA_DEFAULTS = {
  categoryId: DEFAULT_CATEGORY_ID,
  status: 'active',
  monthlyBudgetHours: 0,
  outcome: '',
  startDay: null,
  endDay: null,
  createdAt: null,
  archived: false,
}

export function migrateArea(area) {
  const known = CATEGORIES.some((category) => category.id === area.categoryId)
  const next = { ...AREA_DEFAULTS, ...area }
  return known ? next : { ...next, categoryId: DEFAULT_CATEGORY_ID }
}

// The running timer is one object or nothing. Anything else (an old
// save, a half-written value) means no timer is running.
export function migrateTimer(saved) {
  return saved && typeof saved === 'object' && typeof saved.startedAt === 'string'
    ? saved
    : null
}

// Keeps only real objects from a saved list, so one damaged entry can't
// crash a screen that reads its fields.
export function onlyObjects(list) {
  return Array.isArray(list)
    ? list.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
}
