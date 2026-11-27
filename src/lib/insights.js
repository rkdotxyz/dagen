/*
  insights.js — what you planned, compared with what you actually did.

  Everything here works on a range of days, { from, to } (both included):
  this week, this month or this quarter. Two kinds of hours:

    planned  the length of tasks placed on days in the range, fixed and
             flexible, but only on days up to today: tomorrow's plan
             hasn't had its chance yet.
    tracked  time entries that started in the range, plus the running
             timer up to now.

  Every metric copes with no data at all: it returns null (or an empty
  list) rather than dividing by zero, so the screen can show "—" and a
  hint instead of NaN.

  Like everything in lib/, "now" is passed in so tests can choose it.
*/

import { CATEGORIES, DEFAULT_CATEGORY_ID } from '../config.js'
import { liveAreas } from './areas.js'
import { addDays, daysBetween, startOfWeek, toStart } from './dates.js'
import { shiftMonth, startOfMonth } from './month.js'
import { dayOf } from './placement.js'
import { entryMinutes } from './timer.js'

// The average month, for turning a monthly budget into a budget for any
// number of days.
export const DAYS_PER_MONTH = 30.4

// Six or more Areas in one day is a lot of switching.
export const BUSY_SWITCHING = 6

// ---- Ranges ----

// The current week, month or quarter (three months from this one), as
// { from, to, name, within }: name starts a sentence ("November went
// to…"), within ends one ("Nothing tracked in November yet").
export function periodRange(period, today) {
  if (period === 'week') {
    const from = startOfWeek(today)
    return { from: from, to: addDays(from, 6), name: 'This week', within: 'this week' }
  }

  const from = startOfMonth(today)
  const months = period === 'quarter' ? 3 : 1
  const to = addDays(shiftMonth(from, months), -1)
  const monthLabel = (day, options) =>
    new Date(`${day}T12:00`).toLocaleDateString('en-GB', options)

  const name =
    period === 'quarter'
      ? `${monthLabel(from, { month: 'short' })} – ${monthLabel(to, { month: 'short' })}`
      : monthLabel(from, { month: 'long' })
  return { from: from, to: to, name: name, within: `in ${name}` }
}

const inRange = (day, range) => Boolean(day) && day >= range.from && day <= range.to

// ---- Tracked time ----

// The running timer as if it were an entry ending now, so tracked time
// includes what you're doing at this moment.
export function timerAsEntry(timer, now) {
  if (!timer) return null
  return {
    id: 'running',
    taskId: timer.taskId ?? null,
    areaId: timer.areaId ?? null,
    categoryId: timer.categoryId ?? DEFAULT_CATEGORY_ID,
    label: timer.label,
    start: toStart(new Date(timer.startedAt)),
    end: toStart(now),
    source: 'timer',
  }
}

// The entries that count for this range, the running timer included.
export function entriesIn(range, entries, timer = null, now = new Date()) {
  const running = timerAsEntry(timer, now)
  return [...entries, ...(running ? [running] : [])].filter(
    (entry) => typeof entry.start === 'string' && inRange(entry.start.slice(0, 10), range),
  )
}

// Adds hours up by some key: { [key]: hours }.
function sumBy(items, keyOf, minutesOf) {
  const totals = {}
  for (const item of items) {
    const key = keyOf(item)
    if (key === null || key === undefined) continue
    totals[key] = (totals[key] ?? 0) + minutesOf(item) / 60
  }
  return totals
}

export function trackedByCategory(entries) {
  return sumBy(entries, (entry) => entry.categoryId ?? DEFAULT_CATEGORY_ID, entryMinutes)
}

export function trackedByArea(entries) {
  return sumBy(entries, (entry) => entry.areaId, entryMinutes)
}

// ---- Planned time ----

// Tasks placed on days in the range, up to and including today.
export function plannedTasks(range, tasks, today) {
  const last = range.to < today ? range.to : today
  return tasks.filter((task) => {
    const day = dayOf(task)
    return day !== null && day >= range.from && day <= last
  })
}

export function plannedByCategory(range, tasks, today) {
  return sumBy(
    plannedTasks(range, tasks, today),
    (task) => task.categoryId ?? DEFAULT_CATEGORY_ID,
    (task) => task.durationMin,
  )
}

export function plannedByArea(range, tasks, today) {
  return sumBy(plannedTasks(range, tasks, today), (task) => task.areaId, (task) => task.durationMin)
}

// ---- Budgets ----

// Each Area's budget scaled to the range, next to what was tracked on it.
// Paused and archived Areas are left out.
export function budgetVsActual(areas, entries, range) {
  const tracked = trackedByArea(entries)
  const days = daysBetween(range.from, range.to) + 1

  return liveAreas(areas)
    .filter((area) => area.status !== 'paused')
    .map((area) => ({
      area: area,
      budget: ((area.monthlyBudgetHours ?? 0) * days) / DAYS_PER_MONTH,
      actual: tracked[area.id] ?? 0,
    }))
}

// The active Area furthest behind its budget: lowest actual ÷ budget.
// Areas with no budget can't be behind. null if there's nothing to judge.
export function mostBehind(rows) {
  let worst = null
  for (const row of rows) {
    if (row.area.status !== 'active' || row.budget <= 0) continue
    const ratio = row.actual / row.budget
    if (worst === null || ratio < worst.ratio) worst = { ...row, ratio: ratio }
  }
  return worst
}

// The non-paused Area that has gone longest without any tracked time.
// "Never" counts as longest of all. Looks at ALL entries, not just the
// range: it's about how long it's been. null if there are no Areas.
export function longestUntouched(areas, entries, today) {
  let longest = null

  for (const area of liveAreas(areas).filter((item) => item.status !== 'paused')) {
    let last = null
    for (const entry of entries) {
      if (entry.areaId !== area.id || typeof entry.start !== 'string') continue
      const day = entry.start.slice(0, 10)
      if (last === null || day > last) last = day
    }

    const days = last === null ? Infinity : daysBetween(last, today)
    if (longest === null || days > longest.days) longest = { area: area, days: days, last: last }
  }

  return longest
}

// Paused Areas that still got time in the range: a pause that isn't one.
export function pausedButUsed(areas, entries) {
  const tracked = trackedByArea(entries)
  return liveAreas(areas).filter((area) => area.status === 'paused' && (tracked[area.id] ?? 0) > 0)
}

// How long things really take compared with the estimate: for done tasks
// (ticked in the range) that have tracked time, total tracked ÷ total
// estimated. 1.4 means things take 40% longer than planned. null when
// there's nothing to compare yet.
export function estimateAccuracy(tasks, allEntries, range) {
  const done = tasks.filter(
    (task) =>
      task.status === 'done' &&
      typeof task.doneAt === 'string' &&
      inRange(task.doneAt.slice(0, 10), range),
  )

  let estimated = 0
  let tracked = 0
  for (const task of done) {
    const minutes = allEntries
      .filter((entry) => entry.taskId === task.id)
      .reduce((total, entry) => total + entryMinutes(entry), 0)
    if (minutes === 0) continue
    estimated += task.durationMin
    tracked += minutes
  }

  return estimated > 0 ? tracked / estimated : null
}

// How many different Areas got time on each of the last n days, oldest
// first: a sign of how much you're switching between things.
export function areasPerDay(entries, today, n = 14) {
  return Array.from({ length: n }, (_, index) => {
    const day = addDays(today, index - (n - 1))
    const areas = new Set(
      entries
        .filter((entry) => entry.areaId && typeof entry.start === 'string' && entry.start.slice(0, 10) === day)
        .map((entry) => entry.areaId),
    )
    return { day: day, count: areas.size }
  })
}

// The labels that got the most time, most first: [{ label, hours }].
export function topLabels(entries, n = 5) {
  const totals = sumBy(entries, (entry) => entry.label, entryMinutes)
  return Object.entries(totals)
    .map(([label, hours]) => ({ label: label, hours: hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, n)
}

// ---- Shares and balance ----

// Hours per category as shares of the total, in config.js order, with
// the ones that have no hours left out: [{ category, hours, share }].
export function categoryShares(totals) {
  const sum = Object.values(totals).reduce((total, hours) => total + hours, 0)
  if (sum === 0) return []
  return CATEGORIES.filter((category) => (totals[category.id] ?? 0) > 0).map((category) => ({
    category: category,
    hours: totals[category.id],
    share: totals[category.id] / sum,
  }))
}

// How closely the split of tracked time matches the split of planned
// time, 0 to 100. Each category's gap between its tracked share and its
// planned share is added up; that total (at most 2) is scaled so 1.2
// already counts as no match at all. null without both kinds of data.
export function balanceScore(plannedTotals, trackedTotals) {
  const planned = categoryShares(plannedTotals)
  const tracked = categoryShares(trackedTotals)
  if (planned.length === 0 || tracked.length === 0) return null

  const shareOf = (list, id) => list.find((item) => item.category.id === id)?.share ?? 0
  const gap = CATEGORIES.reduce(
    (total, category) => total + Math.abs(shareOf(tracked, category.id) - shareOf(planned, category.id)),
    0,
  )
  const score = 100 - (gap * 100) / 1.2
  return Math.round(Math.min(100, Math.max(0, score)))
}

// ---- The headline ----

// "November went to Classes and Projects; Personal got 7%". The two
// categories with the most tracked time, then the planned category that
// got the smallest share, if it's a different one and got under 15%.
export function insightsHeadline(range, trackedTotals, plannedTotals) {
  const shares = categoryShares(trackedTotals).sort((a, b) => b.share - a.share)
  if (shares.length === 0) return `Nothing tracked ${range.within} yet`

  const top = shares.slice(0, 2).map((item) => item.category.name)
  let sentence = `${range.name} went to ${top.join(' and ')}`

  const plannedIds = Object.keys(plannedTotals).filter((id) => plannedTotals[id] > 0)
  const shareOf = (id) => shares.find((item) => item.category.id === id)?.share ?? 0
  const neglected = plannedIds
    .filter((id) => !shares.slice(0, 2).some((item) => item.category.id === id))
    .map((id) => ({ id: id, share: shareOf(id) }))
    .sort((a, b) => a.share - b.share)[0]

  if (neglected && neglected.share < 0.15) {
    const name = CATEGORIES.find((category) => category.id === neglected.id)?.name ?? neglected.id
    sentence += `; ${name} got ${Math.round(neglected.share * 100)}%`
  }

  return sentence
}
