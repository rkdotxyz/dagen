/*
  App.jsx — the main component of Dagen.

  App owns the tasks, which sections are folded, and which day you're
  looking at. Everything else is worked out from those three on every
  redraw: the week in the strip, the markers on it, the clashes, and the
  tasks each section shows.

  Since Phase 11 it also owns your Areas and settings, and carries the
  time entries, running timer and away blocks that later phases fill in.
  A task can now have no day (it waits in To place) or a day with no
  time (any time). Anything that needs a task's day asks placement.js.

  Since Phase 12 there are two screens, Day and Week, chosen by the tab
  bar and remembered in the address (#week). Each keeps its own place:
  the Day screen its day, the Week screen its week. App also asks the
  morning rollover question, and fetches busy calendars a week at a time.

  Since Phase 14 there's a Month screen too, with the monthly hour
  budgets. Its sums include weekly chores and lectures as previews
  (recurring.js), so a month of copies is never saved or sent to Google.

  Since Phase 13 it runs the one timer (timer.js): starting a task stops
  whatever ran before, every stop saves one time entry, and both the
  timer and the entries are saved, here and in the cloud.
*/

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import AccountBar from './components/AccountBar.jsx'
import AreasPanel from './components/AreasPanel.jsx'
import CalendarBar from './components/CalendarBar.jsx'
import CalendarPicker from './components/CalendarPicker.jsx'
import CapacityBar from './components/CapacityBar.jsx'
import CategorySection from './components/CategorySection.jsx'
import RolloverPrompt from './components/RolloverPrompt.jsx'
import TabBar from './components/TabBar.jsx'
import TemplatePanel from './components/TemplatePanel.jsx'
import ToPlaceSection from './components/ToPlaceSection.jsx'
import LogTimeForm from './components/LogTimeForm.jsx'
import NowBar from './components/NowBar.jsx'
import TimeLog from './components/TimeLog.jsx'
import Toast from './components/Toast.jsx'
import WeekStrip from './components/WeekStrip.jsx'
import MonthView from './components/MonthView.jsx'
import WeekView from './components/WeekView.jsx'
import { CATEGORIES, DEFAULT_CATEGORY_ID, TABS, getCategory } from './config.js'
import { createArea, removeArea, updateArea } from './lib/areas.js'
import { toBusyBlocks } from './lib/busy.js'
import { createBusyCache, uniqueEvents } from './lib/busyCache.js'
import { daySummary } from './lib/capacity.js'
import { monthWeekStarts, shiftMonth } from './lib/month.js'
import { dayHeadline, halved, placeOn, toPlaceList } from './lib/planning.js'
import { rollOver, rolloverCandidates } from './lib/rollover.js'
import {
  canLogAsPlanned,
  entriesOn,
  lastEntry,
  logAsPlanned,
  startTimer,
  stopTimer,
  timerFor,
} from './lib/timer.js'
import { applyPlan, isEmptyPlan, planSync, signatureOf } from './lib/calendarSync.js'
import { loadPlanner, savePlanner } from './lib/cloud.js'
import { conflictsById } from './lib/conflicts.js'
import {
  createEvent,
  deleteEvent,
  listCalendars,
  listChangedEvents,
  listRangeEvents,
  updateEvent,
} from './lib/googleCalendar.js'
import { applyIncoming } from './lib/incoming.js'
import { missingTasks, previewChores, skipKey } from './lib/recurring.js'
import { isConfigured, supabase } from './lib/supabase.js'
import {
  addDays,
  formatDay,
  formatMonthLabel,
  monthDays,
  startOfWeek,
  toMinutes,
  toStart,
  todayISO,
  weekDays,
} from './lib/dates.js'
import { TASK_DEFAULTS } from './lib/migrate.js'
import { dayOf, timeOf, withDay } from './lib/placement.js'
import {
  loadAreas,
  loadAway,
  loadEntries,
  loadSettings,
  loadTimer,
  saveAreas,
  saveAway,
  saveEntries,
  saveSettings,
  saveTimer,
  loadRolloverAsked,
  loadTab,
  saveRolloverAsked,
  saveTab,
  loadBusyCalendars,
  loadCollapsed,
  loadSent,
  loadSyncedAt,
  loadSkipped,
  loadTasks,
  loadTemplates,
  saveBusyCalendars,
  saveCollapsed,
  saveSent,
  saveSyncedAt,
  saveSkipped,
  saveTasks,
  saveTemplates,
} from './lib/storage.js'

// What Dagen asks Google for. "calendar.events" is permission to make and
// change events; "calendar.readonly" is for Phase 9, when the conflict
// check starts reading your lectures. Asking for both now means one trip
// through Google's consent screen instead of two.
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Adds any recurring chores that this day should have and doesn't yet.
// Returns the list unchanged when there's nothing to add, so React has
// no reason to redraw.
function fillChores(tasks, day, templates, skipped) {
  const extra = missingTasks(templates, day, tasks, skipped)
  if (extra.length === 0) return tasks

  return [...tasks, ...extra.map((task) => ({ id: makeId(), ...task }))]
}

// The same for several days at once: the Week screen needs all seven
// days' chores (and fixed lectures) to add up their hours.
function fillDays(tasks, days, templates, skipped) {
  return days.reduce((current, day) => fillChores(current, day, templates, skipped), tasks)
}

// Which screen to open on: the address says (#week), otherwise the last
// one you used, otherwise Day. Only screens that exist yet are accepted.
function initialTab() {
  const ready = (id) => TABS.some((tab) => tab.id === id && tab.ready)
  const fromHash = window.location.hash.replace('#', '')
  if (ready(fromHash)) return fromHash
  const saved = loadTab()
  return ready(saved) ? saved : 'day'
}

// How long the Undo toast stays.
const TOAST_MS = 6000

// Earliest first. Within a day, timed tasks come in clock order and
// "any time" ones after them. Tasks with no day at all go last.
function byTime(a, b) {
  const firstDay = dayOf(a)
  const secondDay = dayOf(b)
  if (firstDay !== secondDay) {
    if (firstDay === null) return 1
    if (secondDay === null) return -1
    return firstDay < secondDay ? -1 : 1
  }

  const firstTime = timeOf(a)
  const secondTime = timeOf(b)
  if (firstTime === secondTime) return 0
  if (firstTime === null) return 1
  if (secondTime === null) return -1
  return toMinutes(firstTime) - toMinutes(secondTime)
}

// What the week strip shows under each day: how many tasks are still to
// do, and whether any of them clash. { "2026-10-05": { count, hasConflict } }
function dayMarkers(tasks, conflicts) {
  const markers = {}

  for (const task of tasks) {
    if (task.status === 'done') continue

    // A task with no day has nowhere on the strip to be counted.
    const day = dayOf(task)
    if (day === null) continue

    const marker = markers[day] ?? { count: 0, hasConflict: false }

    marker.count += 1
    if (conflicts[task.id]) marker.hasConflict = true

    markers[day] = marker
  }

  return markers
}

function App() {
  // Today's chores are filled in as the app starts, before anything is
  // drawn. Doing it here rather than in an effect means no extra redraw,
  // and no risk of a loop.
  const [tasks, setTasks] = useState(() =>
    fillChores(loadTasks(), todayISO(), loadTemplates(), loadSkipped()),
  )
  const [collapsed, setCollapsed] = useState(() => loadCollapsed())
  // The day the strip is on. Dagen always opens on today: this is state,
  // not something saved, so closing and reopening comes back to today.
  const [selectedDay, setSelectedDay] = useState(() => todayISO())
  // Today, checked again whenever you come back to the app, so a tab left
  // open overnight knows it's a new day (and asks the rollover question).
  const [today, setToday] = useState(() => todayISO())
  // Which screen, and where the Week screen is (any day in its week).
  const [tab, setTab] = useState(() => initialTab())
  const [weekDay, setWeekDay] = useState(() => todayISO())
  // And the Month screen's place: any day in the month it shows.
  const [monthDay, setMonthDay] = useState(() => todayISO())
  // The day the rollover question was last answered.
  const [rolloverAsked, setRolloverAsked] = useState(() => loadRolloverAsked())
  // The message at the bottom: { message, actionLabel?, onAction? } or null.
  const [toast, setToast] = useState(null)
  // The Log time form: closed (null), adding ({}), or editing ({ entryId }).
  const [logForm, setLogForm] = useState(null)
  // The recurring chore rules, and the "don't bring this one back" list.
  const [templates, setTemplates] = useState(() => loadTemplates())
  const [skipped, setSkipped] = useState(() => loadSkipped())
  const [showTemplates, setShowTemplates] = useState(false)
  // Who's signed in, or null. Supabase calls this a session.
  const [session, setSession] = useState(null)
  const [syncing, setSyncing] = useState(false)
  // What Google Calendar already knows about, and how it's going.
  const [sent, setSent] = useState(() => loadSent())
  const [sending, setSending] = useState(false)
  const [failures, setFailures] = useState(0)
  // What else is booked on the day you're looking at, and which
  // calendars that comes from.
  const [busy, setBusy] = useState([])
  const [calendars, setCalendars] = useState([])
  const [busyCalendars, setBusyCalendars] = useState(() => loadBusyCalendars())
  const [showCalendars, setShowCalendars] = useState(false)
  // Phase 11: the things you're involved in, and the planner's settings.
  // Entries, the timer and away blocks have no screens yet (Phases 13
  // and 15), but they're loaded and saved already, so nothing written by
  // a newer version on another device is ever thrown away here.
  const [areas, setAreas] = useState(() => loadAreas())
  const [settings, setSettings] = useState(() => loadSettings())
  const [entries, setEntries] = useState(() => loadEntries())
  const [activeTimer, setActiveTimer] = useState(() => loadTimer())
  const [away, setAway] = useState(() => loadAway())
  const [showAreas, setShowAreas] = useState(false)
  // Busy events, kept per calendar and week for as long as the app is
  // open. useRef keeps the same cache across redraws without causing any.
  const busyCache = useRef(null)
  // Bumped when you come back to the app, so busy calendars are re-read.
  const [busyRefresh, setBusyRefresh] = useState(0)

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  useEffect(() => {
    saveSkipped(skipped)
  }, [skipped])

  useEffect(() => {
    saveSent(sent)
  }, [sent])

  useEffect(() => {
    saveBusyCalendars(busyCalendars)
  }, [busyCalendars])

  useEffect(() => {
    saveAreas(areas)
  }, [areas])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  useEffect(() => {
    saveTimer(activeTimer)
  }, [activeTimer])

  useEffect(() => {
    saveAway(away)
  }, [away])

  useEffect(() => {
    saveTab(tab)
  }, [tab])

  // Coming back to the app: is it a new day? Did a calendar change?
  useEffect(() => {
    function wakeUp() {
      setToday(todayISO())
      busyCache.current?.clear()
      setBusyRefresh((count) => count + 1)
    }

    window.addEventListener('focus', wakeUp)
    return () => window.removeEventListener('focus', wakeUp)
  }, [])

  // The back button changes the address; follow it to that screen.
  useEffect(() => {
    function followHash() {
      const id = window.location.hash.replace('#', '')
      if (TABS.some((item) => item.id === id && item.ready)) setTab(id)
    }

    window.addEventListener('hashchange', followHash)
    return () => window.removeEventListener('hashchange', followHash)
  }, [])

  // The Week screen adds up all seven days, so their chores (and fixed
  // lectures made by rules) must exist. fillDays returns the same list
  // when nothing is missing, so this can't loop.
  useEffect(() => {
    if (tab !== 'week') return
    setTasks((current) => fillDays(current, weekDays(weekDay), templates, skipped))
  }, [tab, weekDay, templates, skipped])

  // The toast disappears by itself after a few seconds.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // A mirror of the two lists that incoming changes need. Reading them
  // through a ref means the sync below doesn't have to restart every time
  // a task changes, and never works from a stale copy either.
  const latest = useRef({ tasks: tasks, sent: sent })

  useEffect(() => {
    latest.current = { tasks: tasks, sent: sent }
  }, [tasks, sent])

  // Ask Supabase who's signed in, then listen for changes: signing in,
  // signing out, or a session restored when you reopen the app.
  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))

    // Returning a function from an effect is how you clean up. Without
    // this, every redraw would add another listener.
    return () => data.subscription.unsubscribe()
  }, [])

  // When someone signs in: take whatever is in the cloud. If they've
  // never saved, push what's on this device up instead.
  useEffect(() => {
    if (!session) return

    // Set to true if this effect is replaced before the answer arrives
    // (a fast sign out, say), so a late reply can't overwrite newer state.
    let cancelled = false

    loadPlanner(supabase, session.user.id).then((planner) => {
      if (cancelled) return

      if (!planner) {
        savePlanner(supabase, session.user.id, {
          tasks: tasks,
          templates: templates,
          skipped: skipped,
          collapsed: collapsed,
          areas: areas,
          entries: entries,
          activeTimer: activeTimer,
          away: away,
          settings: settings,
        })
        return
      }

      setTasks(planner.tasks)
      setTemplates(planner.templates)
      setSkipped(planner.skipped)
      setCollapsed(planner.collapsed)
      setAreas(planner.areas)
      setEntries(planner.entries)
      setActiveTimer(planner.activeTimer)
      setAway(planner.away)
      setSettings(planner.settings)
    })

    return () => {
      cancelled = true
    }
    // Only when the session changes. The lists are read as they are at
    // that moment, which is what we want: this is a one-off handover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Save to the cloud whenever anything changes, but not on every
  // keystroke: wait 800ms for things to settle. Each change cancels the
  // previous timer, so a burst of edits becomes one write.
  useEffect(() => {
    if (!session) return

    setSyncing(true)
    const timer = setTimeout(() => {
      savePlanner(supabase, session.user.id, {
        tasks: tasks,
        templates: templates,
        skipped: skipped,
        collapsed: collapsed,
        areas: areas,
        entries: entries,
        activeTimer: activeTimer,
        away: away,
        settings: settings,
      }).then(() => setSyncing(false))
    }, 800)

    return () => clearTimeout(timer)
  }, [session, tasks, templates, skipped, collapsed, areas, entries, activeTimer, away, settings])

  // The permission to touch your calendar, handed over by Google when you
  // connect. It lives on the session, and lasts about an hour.
  const calendarToken = session?.provider_token ?? null

  // Send changes to Google: work out the plan, carry it out, remember what
  // was sent. The wait lets a burst of edits settle into one round.
  useEffect(() => {
    if (!calendarToken) return

    const timer = setTimeout(async () => {
      const plan = planSync(sent, tasks)
      if (isEmptyPlan(plan)) return

      setSending(true)

      // The three functions, with the token already filled in, so
      // calendarSync.js never has to know about tokens.
      const api = {
        createEvent: (task, category) => createEvent(calendarToken, task, category),
        updateEvent: (eventId, task, category) =>
          updateEvent(calendarToken, eventId, task, category),
        deleteEvent: (eventId) => deleteEvent(calendarToken, eventId),
      }

      const result = await applyPlan(api, plan, sent, getCategory)

      setSent(result.sent)
      setFailures(result.failures)
      setSending(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [calendarToken, tasks, sent])

  // ---- changes made in Google Calendar, coming back ----
  //
  // Runs when the calendar is connected and whenever you come back to the
  // app, which is exactly when something may have changed over there.
  useEffect(() => {
    if (!calendarToken) return

    let active = true

    async function pull() {
      // The first time, look back a week. After that, only since the
      // last look. The moment is noted BEFORE asking, so anything that
      // changes while the request is in flight is caught next time.
      const since =
        loadSyncedAt() ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const askedAt = new Date().toISOString()

      try {
        const events = await listChangedEvents(calendarToken, since)
        if (!active) return

        const result = applyIncoming(
          events,
          latest.current.tasks,
          latest.current.sent,
          signatureOf,
        )

        if (result.applied > 0) {
          setTasks(result.tasks)
          setSent(result.sent)
        }

        saveSyncedAt(askedAt)
      } catch (error) {
        console.error('Could not read from Google Calendar:', error.message)
      }
    }

    pull()

    // "focus" fires when you switch back to the tab or reopen the app.
    window.addEventListener('focus', pull)

    return () => {
      active = false
      window.removeEventListener('focus', pull)
    }
  }, [calendarToken])

  // The list of calendars you could mark as busy.
  useEffect(() => {
    if (!calendarToken) return

    let active = true

    listCalendars(calendarToken)
      .then((found) => active && setCalendars(found))
      .catch((error) => console.error('Could not list calendars:', error.message))

    return () => {
      active = false
    }
  }, [calendarToken])

  // What else is booked: lectures, meetings. Since Phase 12 these take
  // capacity too, and the Week screen shows all seven days, so a whole
  // week is fetched at a time: the Day screen's week and the Week
  // screen's week. The cache means moving back and forth asks Google once.
  const dayWeek = startOfWeek(selectedDay)
  const shownWeek = startOfWeek(weekDay)
  // Since Phase 14 the Month screen needs every week it touches (4 to 6).
  // Joined into one text so the effect below only reruns when it changes.
  const monthWeeks = tab === 'month' ? monthWeekStarts(monthDay).join(',') : ''

  useEffect(() => {
    if (!calendarToken || busyCalendars.length === 0) {
      setBusy([])
      return
    }

    // A new token (a new sign-in) starts a fresh cache.
    if (!busyCache.current || busyCache.current.token !== calendarToken) {
      busyCache.current = createBusyCache((calendarId, from, until) =>
        listRangeEvents(calendarToken, calendarId, from, until),
      )
      busyCache.current.token = calendarToken
    }

    let active = true
    // Each week once, whichever screens need it.
    const weeks = [
      ...new Set([dayWeek, shownWeek, ...(monthWeeks ? monthWeeks.split(',') : [])]),
    ]

    Promise.all(
      weeks.flatMap((week) =>
        busyCalendars.map((calendarId) => busyCache.current.week(calendarId, week)),
      ),
    ).then((lists) => {
      if (active) setBusy(toBusyBlocks(uniqueEvents(lists)))
    })

    return () => {
      active = false
    }
  }, [calendarToken, busyCalendars, dayWeek, shownWeek, monthWeeks, busyRefresh])

  // A new task gets every Phase 11 field. The details come last, so
  // anything the form chose (including a category set by an Area) wins.
  // withDay keeps day in step with start.
  function addTask(categoryId, details) {
    setTasks([
      ...tasks,
      withDay({
        ...TASK_DEFAULTS,
        id: makeId(),
        categoryId: categoryId,
        status: 'todo',
        ...details,
      }),
    ])
  }

  // Changes some fields of one task and leaves the rest alone.
  function updateTask(id, changes) {
    setTasks(
      tasks.map((task) => (task.id === id ? withDay({ ...task, ...changes }) : task)),
    )
  }

  // Ticking notes the moment (doneAt), which the Insights screen will use
  // later. Unticking clears it again.
  function toggleTask(id) {
    const isDone = tasks.find((task) => task.id === id).status === 'done'
    updateTask(id, {
      status: isDone ? 'todo' : 'done',
      doneAt: isDone ? null : toStart(),
    })
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id)

    // Deleting a chore means "not this time", not "stop the rule". Note
    // the day so it isn't made again the next time you open that day.
    // A chore copy you unplaced has no day, so there's nothing to note.
    const day = task ? dayOf(task) : null
    if (task?.templateId && day) {
      setSkipped([...skipped, skipKey(task.templateId, day)])
    }

    setTasks(tasks.filter((item) => item.id !== id))
  }

  // Moving to another day is the moment its chores are filled in. The
  // three ways of moving (tapping a day, the arrows, Today) all come here.
  function goToDay(day) {
    setSelectedDay(day)
    setTasks((current) => fillChores(current, day, templates, skipped))
  }

  function addTemplate(details) {
    const template = { id: makeId(), ...details }
    setTemplates([...templates, template])
    // So a new chore shows up straight away, not only tomorrow.
    setTasks((current) =>
      fillChores(current, selectedDay, [...templates, template], skipped),
    )
  }

  // Deleting a rule stops future copies. The ones already on your days
  // stay: they're ordinary tasks now, and some may be done already.
  function deleteTemplate(id) {
    setTemplates(templates.filter((template) => template.id !== id))
  }

  // ---- Planning (Phase 12) ----

  function changeTab(next) {
    setTab(next)
    // Writing the address adds a step to the browser's history, so the
    // back button returns to the previous screen.
    window.location.hash = next
  }

  // "Place on…" and dropping a task on a day. A task that had a time keeps
  // it on the new day; one without goes in as "any time".
  function placeTask(id, day) {
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    const time = timeOf(task)
    updateTask(id, time ? { start: `${day}T${time}`, day: day } : placeOn(day))
  }

  // Dragged back to To place: no day, no time.
  function unplaceTask(id) {
    updateTask(id, { start: null, day: null })
  }

  function halveTask(id) {
    updateTask(id, halved(tasks.find((task) => task.id === id)))
  }

  // Dropping is deleting, with a few seconds to change your mind.
  function dropTask(id) {
    const index = tasks.findIndex((task) => task.id === id)
    if (index === -1) return
    const task = tasks[index]
    setTasks(tasks.filter((item) => item.id !== id))
    setToast({
      message: `Dropped ${task.title}.`,
      actionLabel: 'Undo',
      // Puts it back where it was, unless it somehow came back already.
      onAction: () => {
        setTasks((current) => {
          if (current.some((item) => item.id === task.id)) return current
          const next = [...current]
          next.splice(Math.min(index, next.length), 0, task)
          return next
        })
        setToast(null)
      },
    })
  }

  // ---- The timer (Phase 13) ----

  // Every timer change goes through here: keep the new timer and entries,
  // and say so when a too-short run was thrown away.
  function applyTimer(result) {
    setActiveTimer(result.state.activeTimer)
    setEntries(result.state.entries)
    if (result.discarded) {
      setToast({ message: 'Under a minute, so it wasn’t saved.' })
    }
  }

  function startTask(task) {
    applyTimer(startTimer({ activeTimer: activeTimer, entries: entries }, timerFor(task)))
  }

  function stopRunning() {
    applyTimer(stopTimer({ activeTimer: activeTimer, entries: entries }))
  }

  // Restarts whatever was tracked most recently.
  function resumeLast() {
    const last = lastEntry(entries)
    if (!last) return
    applyTimer(startTimer({ activeTimer: activeTimer, entries: entries }, last))
  }

  function logTaskAsPlanned(task) {
    setEntries([...entries, logAsPlanned(task)])
  }

  // Saves the Log time form: a new entry, or changes to one.
  function saveEntry(details) {
    const area = areas.find((item) => item.id === details.areaId) ?? null
    const editing = logForm?.entryId
      ? entries.find((entry) => entry.id === logForm.entryId)
      : null

    const entry = {
      id: editing?.id ?? `e_${makeId()}`,
      taskId: editing?.taskId ?? null,
      areaId: details.areaId,
      // The category is copied in now, so the entry still counts if its
      // Area or task goes away later.
      categoryId: area?.categoryId ?? editing?.categoryId ?? DEFAULT_CATEGORY_ID,
      label: details.label || area?.name || 'Time',
      start: details.start,
      end: details.end,
      source: editing?.source ?? 'manual',
    }

    setEntries(
      editing
        ? entries.map((item) => (item.id === editing.id ? entry : item))
        : [...entries, entry],
    )
    setLogForm(null)
  }

  // Deleting an entry, with a few seconds to change your mind.
  function deleteEntry(id) {
    const entry = entries.find((item) => item.id === id)
    if (!entry) return
    setEntries(entries.filter((item) => item.id !== id))
    setToast({
      message: `Deleted ${entry.label}.`,
      actionLabel: 'Undo',
      onAction: () => {
        setEntries((current) =>
          current.some((item) => item.id === entry.id) ? current : [...current, entry],
        )
        setToast(null)
      },
    })
  }

  // What every task row needs to know about the timer.
  const timerActions = {
    runningTaskId: activeTimer?.taskId ?? null,
    onStart: startTask,
    canLogAsPlanned: (task) => canLogAsPlanned(task, entries),
    onLogAsPlanned: logTaskAsPlanned,
  }

  // The answer to the morning question. Either way, it's not asked again
  // today.
  function answerRollover(move) {
    if (move) setTasks((current) => rollOver(current, today))
    setRolloverAsked(today)
    saveRolloverAsked(today)
  }

  // From the Week screen: open that day on the Day screen.
  function openDay(day) {
    goToDay(day)
    changeTab('day')
  }

  // ---- Areas ----

  function addArea(details) {
    setAreas([...areas, createArea(details, `a_${makeId()}`)])
  }

  function changeArea(id, changes) {
    setAreas(updateArea(areas, id, changes))
  }

  // Archives an Area that's in use, deletes one that isn't (areas.js).
  function deleteArea(id) {
    setAreas(removeArea(areas, id, tasks, entries))
  }

  function toggleCollapse(categoryId) {
    setCollapsed(
      collapsed.includes(categoryId)
        ? collapsed.filter((id) => id !== categoryId)
        : [...collapsed, categoryId],
    )
  }

  // Lectures and meetings are judged by the same overlap rule as tasks:
  // they're simply added to the list handed to it.
  const conflicts = conflictsById([...tasks, ...busy])
  const days = weekDays(selectedDay)
  const markers = dayMarkers(tasks, conflicts)

  // Only the selected day's tasks reach the sections, earliest first.
  // That includes the ones placed "any time" on it.
  const dayTasks = [...tasks].filter((task) => dayOf(task) === selectedDay).sort(byTime)

  // Tasks with no day yet, still to do, in the order to deal with them.
  const toPlace = toPlaceList(tasks)

  // The Day screen's capacity: fixed, planned and free hours.
  const selectedSummary = daySummary(selectedDay, {
    tasks: tasks,
    busy: busy,
    settings: settings,
    away: away,
  })

  // The morning question: only when rollover is on, there's something to
  // move, and it hasn't been answered today.
  const rolloverCount =
    settings.rolloverEnabled && rolloverAsked !== today
      ? rolloverCandidates(tasks, today).length
      : 0

  return (
    // The Week screen needs more room than a phone column on a computer.
    <main className={tab === 'week' || tab === 'month' ? 'app wide' : 'app'}>
      <header className="app-header">
        <h1>Dagen</h1>
        {tab === 'day' && (
          <p className="today">{formatDay(selectedDay, new Date(`${today}T12:00`))}</p>
        )}

        {/* Filled while its panel is open, outline when closed. */}
        <Button
          className="areas-button"
          variant={showAreas ? 'default' : 'outline'}
          onClick={() => setShowAreas(!showAreas)}
          aria-expanded={showAreas}
        >
          Areas
        </Button>

        <Button
          variant={showTemplates ? 'default' : 'outline'}
          onClick={() => setShowTemplates(!showTemplates)}
          aria-expanded={showTemplates}
        >
          Repeats
        </Button>
      </header>

      {/* Sticky: what's running stays in view on every screen. */}
      <NowBar
        timer={activeTimer}
        last={lastEntry(entries)}
        onStop={stopRunning}
        onResume={resumeLast}
        onLogTime={() => setLogForm({})}
      />

      {logForm && (
        <LogTimeForm
          // A new key for each entry, so the form starts fresh each time.
          key={logForm.entryId ?? 'new'}
          entry={entries.find((entry) => entry.id === logForm.entryId) ?? null}
          areas={areas}
          defaultDay={tab === 'day' ? selectedDay : today}
          onSave={saveEntry}
          onCancel={() => setLogForm(null)}
        />
      )}

      <AccountBar
        isConfigured={isConfigured}
        session={session}
        syncing={syncing}
        onSignIn={() =>
          supabase.auth.signInWithOAuth({
            provider: 'google',
            // Come back to the page you're on, wherever it's running.
            options: { redirectTo: window.location.origin },
          })
        }
        onSignOut={() => supabase.auth.signOut()}
      />

      <CalendarBar
        session={session}
        token={calendarToken}
        failures={failures}
        sending={sending}
        onChooseCalendars={() => setShowCalendars(!showCalendars)}
        onConnect={() =>
          supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              scopes: CALENDAR_SCOPES,
              // Ask Google to show the permission screen even if you've
              // approved before, so connecting always actually connects.
              queryParams: { access_type: 'offline', prompt: 'consent' },
              redirectTo: window.location.origin,
            },
          })
        }
      />

      {showCalendars && (
        <CalendarPicker
          calendars={calendars}
          chosen={busyCalendars}
          onToggle={(id) =>
            setBusyCalendars(
              busyCalendars.includes(id)
                ? busyCalendars.filter((item) => item !== id)
                : [...busyCalendars, id],
            )
          }
        />
      )}

      {showAreas && (
        <AreasPanel
          areas={areas}
          tasks={tasks}
          entries={entries}
          settings={settings}
          onAdd={addArea}
          onUpdate={changeArea}
          onRemove={deleteArea}
          onChangeSettings={setSettings}
        />
      )}

      {showTemplates && (
        <TemplatePanel
          templates={templates}
          areas={areas}
          onAdd={addTemplate}
          onDelete={deleteTemplate}
        />
      )}

      {rolloverCount > 0 && (
        <RolloverPrompt
          count={rolloverCount}
          onMove={() => answerRollover(true)}
          onDismiss={() => answerRollover(false)}
        />
      )}

      <TabBar tab={tab} onChange={changeTab} />

      {tab === 'day' && (
        <>
          <WeekStrip
            days={days}
            selectedDay={selectedDay}
            today={today}
            markers={markers}
            monthLabel={formatMonthLabel(days)}
            onSelect={goToDay}
            // Moving a week keeps the same weekday: Wednesday to Wednesday.
            onShiftWeek={(amount) => goToDay(addDays(selectedDay, amount * 7))}
            onToday={() => goToDay(today)}
          />

          {/* The finding first: "Friday · 3h free", or by how much it's over. */}
          <h2 className="headline">{dayHeadline(selectedSummary)}</h2>
          <CapacityBar summary={selectedSummary} />

          {CATEGORIES.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              areas={areas}
              tasks={dayTasks.filter((task) => task.categoryId === category.id)}
              allTasks={[...tasks, ...busy]}
              conflicts={conflicts}
              selectedDay={selectedDay}
              isCollapsed={collapsed.includes(category.id)}
              onToggleCollapse={toggleCollapse}
              onAdd={addTask}
              onUpdateTask={updateTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              timer={timerActions}
            />
          ))}

          <TimeLog
            entries={entriesOn(selectedDay, entries)}
            areas={areas}
            onAdd={() => setLogForm({})}
            onEdit={(entryId) => setLogForm({ entryId: entryId })}
            onDelete={deleteEntry}
          />

          <ToPlaceSection
            tasks={toPlace}
            areas={areas}
            allTasks={tasks}
            today={today}
            timer={timerActions}
            onUpdateTask={updateTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onPlace={placeTask}
            onHalve={halveTask}
            onDrop={dropTask}
            onDragStart={(event, task) => event.dataTransfer.setData('text/plain', task.id)}
            onDropHere={unplaceTask}
          />
        </>
      )}

      {tab === 'week' && (
        <WeekView
          weekDay={weekDay}
          today={today}
          tasks={tasks}
          busy={busy}
          areas={areas}
          settings={settings}
          away={away}
          conflicts={conflicts}
          toPlace={toPlace}
          timer={timerActions}
          onShiftWeek={(amount) => setWeekDay(addDays(weekDay, amount * 7))}
          onThisWeek={() => setWeekDay(today)}
          onOpenDay={openDay}
          onUpdateTask={updateTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onPlace={placeTask}
          onHalve={halveTask}
          onDrop={dropTask}
          onDropOnDay={placeTask}
          onUnplace={unplaceTask}
        />
      )}

      {tab === 'month' && (
        <MonthView
          monthDay={monthDay}
          today={today}
          // Real tasks plus previews of the month's weekly chores and
          // lectures, so their hours count without being saved.
          tasks={[...tasks, ...previewChores(templates, monthDays(monthDay), tasks, skipped)]}
          busy={busy}
          areas={areas}
          entries={entries}
          settings={settings}
          away={away}
          onShiftMonth={(amount) => setMonthDay(shiftMonth(monthDay, amount))}
          onThisMonth={() => setMonthDay(today)}
          onOpenDay={openDay}
          onChangeBudget={(id, hours) => changeArea(id, { monthlyBudgetHours: hours })}
        />
      )}

      {toast && (
        <Toast message={toast.message} actionLabel={toast.actionLabel} onAction={toast.onAction} />
      )}
    </main>
  )
}

export default App
