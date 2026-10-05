/*
  App.jsx — the main component of Dagen.

  App owns the tasks, which sections are folded, and which day you're
  looking at. Everything else is worked out from those three on every
  redraw: the week in the strip, the markers on it, the clashes, and the
  tasks each section shows.
*/

import { useEffect, useState } from 'react'
import AccountBar from './components/AccountBar.jsx'
import CalendarBar from './components/CalendarBar.jsx'
import CategorySection from './components/CategorySection.jsx'
import TemplatePanel from './components/TemplatePanel.jsx'
import WeekStrip from './components/WeekStrip.jsx'
import { CATEGORIES, getCategory } from './config.js'
import { applyPlan, isEmptyPlan, planSync } from './lib/calendarSync.js'
import { loadPlanner, savePlanner } from './lib/cloud.js'
import { conflictsById } from './lib/conflicts.js'
import { createEvent, deleteEvent, updateEvent } from './lib/googleCalendar.js'
import { missingTasks, skipKey } from './lib/recurring.js'
import { isConfigured, supabase } from './lib/supabase.js'
import {
  addDays,
  formatDay,
  formatMonthLabel,
  splitStart,
  toMinutes,
  todayISO,
  weekDays,
} from './lib/dates.js'
import {
  loadCollapsed,
  loadSent,
  loadSkipped,
  loadTasks,
  loadTemplates,
  saveCollapsed,
  saveSent,
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

function byTime(a, b) {
  const first = splitStart(a.start)
  const second = splitStart(b.start)
  if (first.day !== second.day) return first.day < second.day ? -1 : 1
  return toMinutes(first.time) - toMinutes(second.time)
}

// What the week strip shows under each day: how many tasks are still to
// do, and whether any of them clash. { "2026-10-05": { count, hasConflict } }
function dayMarkers(tasks, conflicts) {
  const markers = {}

  for (const task of tasks) {
    if (task.status === 'done') continue

    const { day } = splitStart(task.start)
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
  const [today] = useState(() => todayISO())
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

  // Ask Supabase who's signed in, then listen for changes: signing in,
  // signing out, or a session restored when you reopen the app.
  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    )

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
        })
        return
      }

      setTasks(planner.tasks)
      setTemplates(planner.templates)
      setSkipped(planner.skipped)
      setCollapsed(planner.collapsed)
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
      }).then(() => setSyncing(false))
    }, 800)

    return () => clearTimeout(timer)
  }, [session, tasks, templates, skipped, collapsed])


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

  function addTask(categoryId, details) {
    setTasks([...tasks, { id: makeId(), categoryId: categoryId, status: 'todo', ...details }])
  }

  // Changes some fields of one task and leaves the rest alone.
  function updateTask(id, changes) {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)))
  }

  function toggleTask(id) {
    updateTask(id, {
      status: tasks.find((task) => task.id === id).status === 'done' ? 'todo' : 'done',
    })
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id)

    // Deleting a chore means "not this time", not "stop the rule". Note
    // the day so it isn't made again the next time you open that day.
    if (task?.templateId) {
      setSkipped([...skipped, skipKey(task.templateId, splitStart(task.start).day)])
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
    setTasks((current) => fillChores(current, selectedDay, [...templates, template], skipped))
  }

  // Deleting a rule stops future copies. The ones already on your days
  // stay: they're ordinary tasks now, and some may be done already.
  function deleteTemplate(id) {
    setTemplates(templates.filter((template) => template.id !== id))
  }

  function toggleCollapse(categoryId) {
    setCollapsed(
      collapsed.includes(categoryId)
        ? collapsed.filter((id) => id !== categoryId)
        : [...collapsed, categoryId],
    )
  }

  const conflicts = conflictsById(tasks)
  const days = weekDays(selectedDay)
  const markers = dayMarkers(tasks, conflicts)

  // Only the selected day's tasks reach the sections, earliest first.
  const dayTasks = [...tasks]
    .filter((task) => splitStart(task.start).day === selectedDay)
    .sort(byTime)

  return (
    <main className="app">
      <header className="app-header">
        <h1>Dagen</h1>
        <p className="today">{formatDay(selectedDay, new Date(`${today}T12:00`))}</p>

        <button
          type="button"
          className="repeats-button"
          onClick={() => setShowTemplates(!showTemplates)}
          aria-expanded={showTemplates}
        >
          Repeats
        </button>
      </header>

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

      {showTemplates && (
        <TemplatePanel
          templates={templates}
          onAdd={addTemplate}
          onDelete={deleteTemplate}
        />
      )}

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

      {CATEGORIES.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          tasks={dayTasks.filter((task) => task.categoryId === category.id)}
          allTasks={tasks}
          conflicts={conflicts}
          selectedDay={selectedDay}
          isCollapsed={collapsed.includes(category.id)}
          onToggleCollapse={toggleCollapse}
          onAdd={addTask}
          onUpdateTask={updateTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
        />
      ))}
    </main>
  )
}

export default App
