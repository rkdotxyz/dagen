/*
  away.js — time you're away: a trip, a holiday.

  An away block is { id, title, startDay, endDay }, both days included.
  Days inside one have no capacity at all ("the lid is on"), which
  capacity.js already respects. This file only checks a block and
  describes it. Away blocks stay in Dagen: they're not sent to Google.
*/

import { formatDayRange } from './dates.js'

// What's wrong with a block, in words, or null if it's fine.
export function awayProblem({ title, startDay, endDay }) {
  if (!title.trim()) return 'Give it a name, like "Winter trip".'
  if (!startDay || !endDay) return 'Add the first and last day.'
  if (endDay < startDay) return 'The last day can’t be before the first.'
  return null
}

// "18 Dec – 5 Jan"
export function describeAway(block) {
  return formatDayRange(block.startDay, block.endDay)
}

// Earliest first, so the list reads like a calendar.
export function sortedAway(away) {
  return [...away].sort((a, b) => (a.startDay < b.startDay ? -1 : a.startDay > b.startDay ? 1 : 0))
}
