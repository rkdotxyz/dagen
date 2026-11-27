/*
  cloud.js — reading and writing your planner in the cloud.

  Dagen stores everything as ONE row per person: a single JSON blob with
  your tasks, chore rules, refusals, folded sections, and since Phase 11
  your Areas, time entries, the running timer, away blocks and settings.
  A row per task would be the usual shape for a big app, but this is a
  personal planner that already keeps the whole list in memory, and one
  row means no schema to migrate every time a task gains a field.

  The database client is passed in rather than imported, so tests can
  hand these functions a fake one.
*/

import {
  migrateArea,
  migrateSettings,
  migrateTask,
  migrateTimer,
  onlyObjects,
} from './migrate.js'

const TABLE = 'planners'

// The shape saved in the cloud. Written out field by field so that a
// stray value in state can never leak into the database.
//
// TODO (later than v3.0): time entries grow by roughly 550 KB a year at
// 10 a day. That's fine in one row for now. Once it gets big, move
// entries older than 18 months into an archive row of their own.
export function toPlanner({
  tasks,
  templates,
  skipped,
  collapsed,
  areas,
  entries,
  activeTimer,
  away,
  settings,
}) {
  return {
    tasks: tasks,
    templates: templates,
    skipped: skipped,
    collapsed: collapsed,
    // Phase 11. Defaults here too, so a caller that hasn't caught up
    // yet still saves a complete row.
    areas: areas ?? [],
    entries: entries ?? [],
    activeTimer: activeTimer ?? null,
    away: away ?? [],
    settings: migrateSettings(settings),
  }
}

// The shape read back. Anything missing gets a safe default, so an old
// or half-written row can't crash the app. Tasks and Areas go through
// the same migration as this device's own saves (migrate.js).
export function fromPlanner(data) {
  const safe = (value) => (Array.isArray(value) ? value : [])

  return {
    tasks: onlyObjects(data?.tasks).map(migrateTask),
    templates: safe(data?.templates),
    skipped: safe(data?.skipped),
    collapsed: safe(data?.collapsed),
    areas: onlyObjects(data?.areas).map(migrateArea),
    entries: onlyObjects(data?.entries),
    activeTimer: migrateTimer(data?.activeTimer),
    away: onlyObjects(data?.away),
    settings: migrateSettings(data?.settings),
  }
}

// Returns the planner stored for this person, or null if they've never
// saved one. Errors are reported, not thrown: a planner that still works
// offline beats one that shows a blank screen.
export async function loadPlanner(client, userId) {
  const { data, error } = await client
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    // maybeSingle: "one row or none", instead of treating none as an error.
    .maybeSingle()

  if (error) {
    console.error('Could not load from the cloud:', error.message)
    return null
  }

  return data ? fromPlanner(data.data) : null
}

// Writes the whole planner. upsert = insert the row, or replace it if
// one is already there, in a single request.
export async function savePlanner(client, userId, planner) {
  const { error } = await client.from(TABLE).upsert({
    user_id: userId,
    data: toPlanner(planner),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Could not save to the cloud:', error.message)
    return false
  }

  return true
}
