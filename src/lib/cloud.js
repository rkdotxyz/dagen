/*
  cloud.js — reading and writing your planner in the cloud.

  Dagen stores everything as ONE row per person: a single JSON blob with
  your tasks, chore rules, refusals and folded sections. A row per task
  would be the usual shape for a big app, but this is a personal planner
  that already keeps the whole list in memory, and one row means no
  schema to migrate every time a task gains a field.

  The database client is passed in rather than imported, so tests can
  hand these functions a fake one.
*/

const TABLE = 'planners'

// The shape saved in the cloud. Written out field by field so that a
// stray value in state can never leak into the database.
export function toPlanner({ tasks, templates, skipped, collapsed }) {
  return {
    tasks: tasks,
    templates: templates,
    skipped: skipped,
    collapsed: collapsed,
  }
}

// The shape read back. Anything missing becomes an empty list, so an old
// or half-written row can't crash the app.
export function fromPlanner(data) {
  const safe = (value) => (Array.isArray(value) ? value : [])

  return {
    tasks: safe(data?.tasks),
    templates: safe(data?.templates),
    skipped: safe(data?.skipped),
    collapsed: safe(data?.collapsed),
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
