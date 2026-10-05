/*
  incoming.js — changes made in Google Calendar, coming back.

  Google hands us events; this file turns them into changes to tasks.
  It talks to nothing and remembers nothing, so every rule below can be
  tested exactly.

  Two rules decide what Dagen will touch:
    - only events carrying a dagenTaskId (its own work)
    - only tasks it already knows about
  An event you make yourself in Google Calendar has no such id, so it is
  ignored. Creation stays app-only, as the plan says.
*/

const TASK_ID_KEY = 'dagenTaskId'

// The hidden id Dagen put on the event, or null if this isn't ours.
export function taskIdOf(event) {
  return event.extendedProperties?.private?.[TASK_ID_KEY] ?? null
}

// "2026-10-05T14:00:00+02:00" -> "2026-10-05T14:00"
// Google gives the time as it reads on the calendar's own clock, with the
// offset tacked on. The first 16 characters are exactly the wall-clock
// time Dagen stores.
function toStart(dateTime) {
  return dateTime.slice(0, 16)
}

// How long the event runs, in minutes. Date.parse understands the full
// strings including their offsets, so this is right even across a clock
// change.
function durationBetween(startDateTime, endDateTime) {
  return Math.round((Date.parse(endDateTime) - Date.parse(startDateTime)) / 60000)
}

// Google's title, back into a title and a tentative flag. Removing the
// "~" by hand in Google is how you confirm a tentative task.
export function readSummary(summary = '') {
  if (summary.startsWith('~ ')) {
    return { title: summary.slice(2), tentative: true }
  }

  return { title: summary, tentative: false }
}

// What this event says a task should look like now.
export function changesFrom(event) {
  const { title, tentative } = readSummary(event.summary)

  return {
    title: title,
    tentative: tentative,
    start: toStart(event.start.dateTime),
    durationMin: durationBetween(event.start.dateTime, event.end.dateTime),
  }
}

// Works through a batch of events and returns the new tasks, the new
// record of what Google knows, and how many changes were applied.
//
// Updating the record matters as much as updating the task: without it,
// the next outgoing round would see a difference and push the change
// straight back, round and round.
export function applyIncoming(events, tasks, sent, signatureOf) {
  let tasksNow = tasks
  const sentNow = { ...sent }
  let applied = 0

  for (const event of events) {
    const taskId = taskIdOf(event)
    if (!taskId) continue // not ours

    const task = tasksNow.find((item) => item.id === taskId)
    if (!task) continue // already gone from this device

    // An event Google reports as "cancelled" was deleted over there.
    if (event.status === 'cancelled') {
      tasksNow = tasksNow.filter((item) => item.id !== taskId)
      delete sentNow[taskId]
      applied += 1
      continue
    }

    // An all-day event has a date instead of a dateTime. Dagen's tasks
    // always have a time, so leave those alone.
    if (!event.start?.dateTime || !event.end?.dateTime) continue

    const updated = { ...task, ...changesFrom(event) }
    if (signatureOf(updated) === signatureOf(task)) continue // no real change

    tasksNow = tasksNow.map((item) => (item.id === taskId ? updated : item))
    sentNow[taskId] = {
      eventId: event.id,
      signature: signatureOf(updated),
    }
    applied += 1
  }

  return { tasks: tasksNow, sent: sentNow, applied: applied }
}
