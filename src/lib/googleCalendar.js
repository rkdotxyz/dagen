/*
  googleCalendar.js — turning Dagen tasks into Google Calendar events.

  Two halves. The top half is plain translation: a task becomes the JSON
  shape Google expects, and that's testable without any network. The
  bottom half makes the actual requests.

  Dagen writes to your MAIN calendar ("primary") and only ever touches
  events it made. Each event carries the task's id in a hidden field, so
  the app can always recognise its own work.
*/

import { shiftStart } from './dates.js'

const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// The time zone this device is in, e.g. "Europe/Stockholm". Sending it
// with each event is what keeps 18:00 at 18:00 across the clock change
// and when you travel.
export function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// A task as Google wants it. Google's dateTime wants seconds too, hence
// the ":00" on the end of our "2026-10-05T18:00".
export function toEvent(task, category, timeZone = localTimeZone()) {
  return {
    // The tilde marks a time that may still move, exactly as in the app.
    summary: task.tentative ? `~ ${task.title}` : task.title,

    start: { dateTime: `${task.start}:00`, timeZone: timeZone },
    end: { dateTime: `${shiftStart(task.start, task.durationMin)}:00`, timeZone: timeZone },

    // The category's colour, by Google's own number.
    colorId: category.googleColorId,

    // "transparent" means shown as Free: a tentative task shouldn't stop
    // anyone booking that slot through your booking page.
    transparency: task.tentative ? 'transparent' : 'opaque',

    // Hidden on the event, invisible in the Calendar interface. This is
    // the thread back to the task, and how Phase 9 will recognise which
    // events are ours.
    extendedProperties: { private: { dagenTaskId: task.id } },
  }
}

// One place for every request: adds the token, checks the answer, and
// turns a failure into a readable error instead of a silent nothing.
async function request(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  // 404 and 410 on a delete mean the event is already gone, which is
  // the outcome we wanted anyway.
  if (response.status === 404 || response.status === 410) return null

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google Calendar said ${response.status}: ${body}`)
  }

  // A delete returns nothing at all, so there's no JSON to read.
  if (response.status === 204) return null

  return response.json()
}

// Makes the event and hands back the id Google gave it.
export async function createEvent(token, task, category) {
  const event = await request(token, BASE, {
    method: 'POST',
    body: JSON.stringify(toEvent(task, category)),
  })

  return event?.id ?? null
}

// Replaces the event's details. PUT rather than PATCH: we always send
// the whole event, so there's nothing left over from an older version.
export async function updateEvent(token, eventId, task, category) {
  return request(token, `${BASE}/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(toEvent(task, category)),
  })
}

export async function deleteEvent(token, eventId) {
  return request(token, `${BASE}/${eventId}`, { method: 'DELETE' })
}
