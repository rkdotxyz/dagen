/*
  busyCache.js — remembers what's in your busy calendars, week by week.

  Moving between days and screens would otherwise ask Google for the same
  week again and again. This keeps each answer in memory (never saved),
  keyed by calendar and week, so each week is fetched once.

  The fetcher is passed in, so tests can count how often it's called
  without any network.
*/

import { addDays } from './dates.js'

export function createBusyCache(fetchRange) {
  const cache = new Map()

  // A Promise for the events of one calendar in the week starting on
  // weekStart (a Monday). The Promise itself is stored, so two screens
  // asking at the same moment share one request.
  function week(calendarId, weekStart) {
    const key = `${calendarId}|${weekStart}`

    if (!cache.has(key)) {
      const pending = fetchRange(calendarId, weekStart, addDays(weekStart, 7)).catch(
        (error) => {
          // Forget a failure so the next look tries again.
          cache.delete(key)
          console.error('Could not read a calendar:', error.message)
          return []
        },
      )
      cache.set(key, pending)
    }

    return cache.get(key)
  }

  // Forgets everything, so the next look fetches fresh. Used when you
  // come back to the app, in case your calendar changed meanwhile.
  function clear() {
    cache.clear()
  }

  return { week: week, clear: clear }
}

// Several lists of events into one, without doubles: an event that
// crosses midnight on Sunday shows up in two weeks.
export function uniqueEvents(lists) {
  const seen = new Map()
  for (const event of lists.flat()) seen.set(event.id, event)
  return [...seen.values()]
}
