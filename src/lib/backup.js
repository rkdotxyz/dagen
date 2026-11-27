/*
  backup.js — your whole planner as text, and back again.

  "Copy as JSON" puts everything (tasks, rules, Areas, time entries, away
  blocks, settings) on the clipboard as one block of text: a backup, or a
  way to move to another device without signing in. "Import JSON" reads
  such a block and replaces the planner with it.

  Importing is careful: the text must parse, and must look like a Dagen
  export, before anything is replaced. Everything read goes through the
  same safe defaults as a cloud row (cloud.js fromPlanner), so a damaged
  or older export can't crash the app.
*/

import { fromPlanner, toPlanner } from './cloud.js'

// What an export looks like: a small label around the planner, so it can
// be recognised later and read by newer versions.
export function exportPlanner(state, now = new Date()) {
  return JSON.stringify(
    { app: 'dagen', version: 3, exportedAt: now.toISOString(), planner: toPlanner(state) },
    null,
    2,
  )
}

// Reads pasted text. Returns { planner } when it's a Dagen export (with
// or without the label around it), or { error } in words when it isn't.
export function parseImport(text) {
  if (!text.trim()) return { error: 'Paste an export first.' }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { error: 'That isn’t valid JSON. Paste the whole export, from { to }.' }
  }

  const planner = data && typeof data === 'object' && data.app === 'dagen' ? data.planner : data
  const looksRight =
    planner &&
    typeof planner === 'object' &&
    !Array.isArray(planner) &&
    (Array.isArray(planner.tasks) || Array.isArray(planner.areas))

  if (!looksRight) return { error: 'This doesn’t look like a Dagen export.' }
  return { planner: fromPlanner(planner) }
}

// "12 tasks, 5 Areas, 40 time entries": what an import brings.
export function describePlanner(planner) {
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
  return [
    count(planner.tasks.length, 'task', 'tasks'),
    count(planner.areas.length, 'Area', 'Areas'),
    count(planner.entries.length, 'time entry', 'time entries'),
  ].join(', ')
}
