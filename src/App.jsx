/*
  App.jsx — the main component of Dagen.

  App owns the tasks, which sections are folded, and which day you're
  looking at. Everything else is worked out from those three on every
  redraw: the week in the strip, the markers on it, the clashes, and the
  tasks each section shows.
*/

import { useEffect, useState } from 'react'
import CategorySection from './components/CategorySection.jsx'
import WeekStrip from './components/WeekStrip.jsx'
import { CATEGORIES } from './config.js'
import { conflictsById } from './lib/conflicts.js'
import {
  addDays,
  formatDay,
  formatMonthLabel,
  splitStart,
  toMinutes,
  todayISO,
  weekDays,
} from './lib/dates.js'
import { loadCollapsed, loadTasks, saveCollapsed, saveTasks } from './lib/storage.js'

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
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
  const [tasks, setTasks] = useState(() => loadTasks())
  const [collapsed, setCollapsed] = useState(() => loadCollapsed())
  // The day the strip is on. Dagen always opens on today: this is state,
  // not something saved, so closing and reopening comes back to today.
  const [selectedDay, setSelectedDay] = useState(() => todayISO())
  const [today] = useState(() => todayISO())

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

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
    setTasks(tasks.filter((task) => task.id !== id))
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
      </header>

      <WeekStrip
        days={days}
        selectedDay={selectedDay}
        today={today}
        markers={markers}
        monthLabel={formatMonthLabel(days)}
        onSelect={setSelectedDay}
        // Moving a week keeps the same weekday: Wednesday to Wednesday.
        onShiftWeek={(amount) => setSelectedDay(addDays(selectedDay, amount * 7))}
        onToday={() => setSelectedDay(today)}
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
