/*
  busy.js — other people's claims on your time.

  Lectures, meetings, anything already in your Google calendars. These
  are turned into the same shape as a task, purely so the overlap rule
  from Phase 4 can judge them without knowing they're different.

  Three kinds are skipped on purpose:
    - Dagen's own events, which are already in the task list
    - all-day events: holidays and birthdays aren't appointments
    - anything marked "free", which includes tentative Dagen events and
      the availability behind a booking page
*/

import { taskIdOf } from './incoming.js'

export function toBusyBlocks(events) {
  return events
    .filter((event) => event.status !== 'cancelled')
    .filter((event) => !taskIdOf(event))
    .filter((event) => event.start?.dateTime && event.end?.dateTime)
    .filter((event) => event.transparency !== 'transparent')
    .map((event) => ({
      // A prefix no task id can have, so these can never be mistaken for
      // tasks if they ever end up in the same list by accident.
      id: `busy:${event.id}`,
      title: event.summary || 'Busy',
      start: event.start.dateTime.slice(0, 16),
      durationMin: Math.round(
        (Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)) / 60000,
      ),
      status: 'todo',
      // Marks it as something you can't edit here. The rows use this to
      // avoid offering a pencil on a lecture.
      external: true,
    }))
}
