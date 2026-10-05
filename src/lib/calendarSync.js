/*
  calendarSync.js — working out what Google needs to be told.

  The app doesn't announce every change as it happens. Instead it keeps a
  small note of what each task looked like the last time it was sent, and
  compares. That note is the "sent" record:

    { taskId: { eventId: "abc123", signature: "Laundry|2026-10-05T14:00|90|false|chores" } }

  Comparing a before and after picture catches everything: changes made
  while the app was closed, a failed send that should be retried, and
  tasks deleted on another device.

  This file does no talking to Google. It decides; something else acts.
*/

// Everything about a task that Google would see. If this text is the
// same, the event is already right and no request is needed.
export function signatureOf(task) {
  return [
    task.title,
    task.start,
    task.durationMin,
    task.tentative ? 'tentative' : 'firm',
    task.categoryId,
  ].join('|')
}

// Compares what was sent with what exists now.
// Returns three lists: things to make, things to change, things to remove.
export function planSync(sent, tasks) {
  const creates = []
  const updates = []
  const deletes = []

  for (const task of tasks) {
    const previous = sent[task.id]

    if (!previous) {
      creates.push(task)
      continue
    }

    if (previous.signature !== signatureOf(task)) {
      updates.push({ task: task, eventId: previous.eventId })
    }
  }

  // Anything in the record that no longer has a task was deleted.
  for (const [taskId, previous] of Object.entries(sent)) {
    if (!tasks.some((task) => task.id === taskId)) {
      deletes.push({ taskId: taskId, eventId: previous.eventId })
    }
  }

  return { creates: creates, updates: updates, deletes: deletes }
}

// Is there anything at all to do? Saves making a request to find out.
export function isEmptyPlan(plan) {
  return (
    plan.creates.length === 0 &&
    plan.updates.length === 0 &&
    plan.deletes.length === 0
  )
}

// Carries out a plan, one request at a time, and returns the new record.
//
// The api argument is the three functions that talk to Google, passed in
// rather than imported, so tests can hand this a fake.
//
// A failure is caught and counted, not thrown: the record for that task
// is left untouched, so the next run simply tries again.
export async function applyPlan(api, plan, sent, getCategory) {
  const next = { ...sent }
  let failures = 0

  for (const task of plan.creates) {
    try {
      const eventId = await api.createEvent(task, getCategory(task.categoryId))
      if (eventId) next[task.id] = { eventId: eventId, signature: signatureOf(task) }
    } catch (error) {
      console.error('Could not create an event:', error.message)
      failures += 1
    }
  }

  for (const { task, eventId } of plan.updates) {
    try {
      await api.updateEvent(eventId, task, getCategory(task.categoryId))
      next[task.id] = { eventId: eventId, signature: signatureOf(task) }
    } catch (error) {
      console.error('Could not update an event:', error.message)
      failures += 1
    }
  }

  for (const { taskId, eventId } of plan.deletes) {
    try {
      await api.deleteEvent(eventId)
      delete next[taskId]
    } catch (error) {
      console.error('Could not delete an event:', error.message)
      failures += 1
    }
  }

  return { sent: next, failures: failures }
}
