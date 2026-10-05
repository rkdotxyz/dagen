/*
  dates.js — all the date and time arithmetic of Dagen, in one place.

  These are plain functions: give them values, get values back. They draw
  nothing and remember nothing, which makes them easy to test and easy to
  reuse when the week strip and Google Calendar arrive.

  Two formats are used throughout, both plain text:
    a day   "2026-10-05"        (year-month-day, so sorting by text works)
    a time  "14:30"             (24-hour, always two digits)
    a start "2026-10-05T14:30"  (the two joined by a T, like the plan says)

  End times are never stored. They're always start + durationMin.
*/

// Dagen snaps everything to quarter hours.
export const QUARTER = 15

// The duration chips offered in the add form, in minutes.
export const DURATIONS = [15, 30, 45, 60, 90, 120]

// "2026-10-05" for a given Date.
// Careful: the built-in toISOString() converts to UTC first, which in
// Stockholm can land on the previous day. So build it by hand from the
// local year, month and day.
export function toISODate(date) {
  const year = date.getFullYear()
  // getMonth() counts from 0, so January is 0. padStart adds a leading
  // zero: "9" becomes "09", which keeps every date the same length.
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

// "14:30" -> 870 (minutes since midnight). Doing the maths in minutes
// keeps it simple: no hours and minutes to carry between.
export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// 870 -> "14:30". Minutes past midnight wrap around, so 1455 is "00:15".
export function toTime(minutes) {
  const inDay = ((minutes % 1440) + 1440) % 1440 // 1440 = minutes in a day
  const hours = Math.floor(inDay / 60)
  return `${String(hours).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}`
}

// Every quarter hour of the day: "00:00", "00:15" ... "23:45". 96 of them.
export const QUARTER_TIMES = []
for (let minutes = 0; minutes < 24 * 60; minutes += QUARTER) {
  QUARTER_TIMES.push(toTime(minutes))
}

// The next quarter hour from now: at 14:07 you get "14:15".
// Math.ceil rounds up. Passing the date in (instead of always using the
// clock) means tests can ask about any moment they like.
export function nextQuarter(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return toTime(Math.ceil(minutes / QUARTER) * QUARTER)
}

// "2026-10-05" + "14:30" -> "2026-10-05T14:30"
export function makeStart(day, time) {
  return `${day}T${time}`
}

// "2026-10-05T14:30" -> { day: "2026-10-05", time: "14:30" }
export function splitStart(start) {
  const [day, time] = start.split('T')
  return { day: day, time: time }
}

// When a task finishes: "14:30" + 90 minutes -> "16:00"
export function endTime(start, durationMin) {
  const { time } = splitStart(start)
  return toTime(toMinutes(time) + durationMin)
}

// Moves a start forwards or backwards by some minutes, rolling into the
// next or previous day when it needs to: "23:30" + 60 minutes becomes
// "00:30" on the following day. Math.floor rounds DOWN, which is what
// makes going backwards past midnight work too.
export function shiftStart(start, minutes) {
  const { day, time } = splitStart(start)
  const total = toMinutes(time) + minutes
  return makeStart(addDays(day, Math.floor(total / 1440)), toTime(total))
}

// "14:30–16:00" (an en dash, the one used for ranges)
export function formatRange(start, durationMin) {
  return `${splitStart(start).time}–${endTime(start, durationMin)}`
}

// 30 -> "30m", 60 -> "1h", 90 -> "1h 30m"
export function formatDuration(durationMin) {
  const hours = Math.floor(durationMin / 60)
  const minutes = durationMin % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// Moves a day forwards or backwards. Going through a real Date means
// month ends, leap years and the clock change are handled for us:
// addDays('2026-10-31', 1) is '2026-11-01'.
export function addDays(day, amount) {
  const [year, month, date] = day.split('-').map(Number)
  const moved = new Date(year, month - 1, date)
  moved.setDate(moved.getDate() + amount)
  return toISODate(moved)
}

// The Monday of the week a day belongs to.
// getDay() counts from Sunday (0), but Dagen's weeks start on Monday.
// (getDay() + 6) % 7 shifts that: Monday becomes 0, Sunday becomes 6.
export function startOfWeek(day) {
  const [year, month, date] = day.split('-').map(Number)
  const weekday = (new Date(year, month - 1, date).getDay() + 6) % 7
  return addDays(day, -weekday)
}

// The seven days of that week, Monday first.
export function weekDays(day) {
  const monday = startOfWeek(day)
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset))
}

// Turns a day into a real Date, without the browser guessing a time zone
// from text. Used by the two label helpers below.
function toDate(day) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

// "5" — the day of the month, for the week strip.
export function dayNumber(day) {
  return String(toDate(day).getDate())
}

// "M", "T", "W"... the one-letter weekday heading.
export function weekdayLetter(day) {
  return toDate(day).toLocaleDateString('en-GB', { weekday: 'narrow' })
}

// The heading above the strip: "October 2026", or "Sep – Oct 2026" when
// the week straddles two months.
export function formatMonthLabel(days) {
  const first = toDate(days[0])
  const last = toDate(days[days.length - 1])
  const year = last.getFullYear()

  if (first.getMonth() === last.getMonth()) {
    return `${first.toLocaleDateString('en-GB', { month: 'long' })} ${year}`
  }

  const from = first.toLocaleDateString('en-GB', { month: 'short' })
  const to = last.toLocaleDateString('en-GB', { month: 'short' })
  return `${from} – ${to} ${year}`
}

// "Today", "Tomorrow", or "Sat 10 Oct" for anything further away.
export function formatDay(day, now = new Date()) {
  if (day === toISODate(now)) return 'Today'

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1) // setDate handles month ends
  if (day === toISODate(tomorrow)) return 'Tomorrow'

  // Read the parts back out rather than trusting the browser's time zone.
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
