/*
  googleCalendar.js — turning Dagen tasks into Google Calendar events.

  Two halves. The top half is plain translation: a task becomes the JSON
  shape Google expects, and that's testable without any network. The
  bottom half makes the actual requests.

  Dagen writes to your MAIN calendar ("primary") and only ever touches
  events it made. Each event carries the task's id in a hidden field, so
  the app can always recognise its own work.

  Since Phase 9 it also reads: what changed in your own calendar, and
  what else is booked on the day you're looking at.
*/

import { shiftStart } from './dates.js'

const API = 'https://www.googleapis.com/calendar/v3'

// The events of one calendar. encodeURIComponent because calendar ids
// contain @ and other characters that mean something in a web address.
function eventsUrl(calendarId = 'primary') {
  return `${API}/calendars/${encodeURIComponent(calendarId)}/events`
}

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
  const event = await request(token, eventsUrl(), {
    method: 'POST',
    body: JSON.stringify(toEvent(task, category)),
  })

  return event?.id ?? null
}

// Replaces the event's details. PUT rather than PATCH: we always send
// the whole event, so there's nothing left over from an older version.
export async function updateEvent(token, eventId, task, category) {
  return request(token, `${eventsUrl()}/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(toEvent(task, category)),
  })
}

export async function deleteEvent(token, eventId) {
  return request(token, `${eventsUrl()}/${eventId}`, { method: 'DELETE' })
}

// ---- reading ----

// Everything in your main calendar that changed since a moment in time.
// showDeleted brings back the ones removed over there, as "cancelled";
// singleEvents turns a repeating event into its individual days, which
// is the only shape Dagen understands.
export async function listChangedEvents(token, updatedMin) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    showDeleted: 'true',
    maxResults: '250',
    updatedMin: updatedMin,
  })

  const data = await request(token, `${eventsUrl()}?${params}`)
  return data?.items ?? []
}

// Everything booked on one day in one calendar, used by the conflict
// check. The two moments are built from the day at local midnight, then
// turned into the exact format Google wants.
export async function listDayEvents(token, calendarId, day) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: new Date(`${day}T00:00:00`).toISOString(),
    timeMax: new Date(`${day}T23:59:59.999`).toISOString(),
  })

  const data = await request(token, `${eventsUrl(calendarId)}?${params}`)
  return data?.items ?? []
}

// The calendars you can see, so you can choose which ones count as busy.
export async function listCalendars(token) {
  const data = await request(
    token,
    `${API}/users/me/calendarList?minAccessRole=reader&maxResults=100`,
  )

  return (data?.items ?? []).map((calendar) => ({
    id: calendar.id,
    name: calendar.summary,
    primary: Boolean(calendar.primary),
  }))
}
