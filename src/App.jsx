/*
  App.jsx — the main component of Dagen.

  App owns everything that must survive a redraw: the tasks and which
  sections are folded. It also works out, once per redraw, which tasks
  clash, and hands each section its own slice of all three.
*/

import { useEffect, useState } from 'react'
import CategorySection from './components/CategorySection.jsx'
import { CATEGORIES } from './config.js'
import { conflictsById } from './lib/conflicts.js'
import { formatDay, splitStart, toMinutes, todayISO } from './lib/dates.js'
import { loadCollapsed, loadTasks, saveCollapsed, saveTasks } from './lib/storage.js'

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Earliest first. Comparing the day as text works because of the
// year-month-day order; the time is compared in minutes.
function byTime(a, b) {
  const first = splitStart(a.start)
  const second = splitStart(b.start)
  if (first.day !== second.day) return first.day < second.day ? -1 : 1
  return toMinutes(first.time) - toMinutes(second.time)
}

function App() {
  const [tasks, setTasks] = useState(() => loadTasks())
  const [collapsed, setCollapsed] = useState(() => loadCollapsed())
  // Read the clock once, when the app starts, instead of on every redraw.
  const [startedAt] = useState(() => new Date())

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  // details comes from the form: { title, start, durationMin, tentative }
  function addTask(categoryId, details) {
    const newTask = {
      id: makeId(),
      categoryId: categoryId,
      status: 'todo',
      // ...details copies every field of the object in here, so the form
      // can gain a field later without this line changing.
      ...details,
    }
    setTasks([...tasks, newTask])
  }

  function toggleTask(id) {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
          : task,
      ),
    )
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

  // Worked out fresh on every redraw from the tasks themselves, so a flag
  // can never be left behind after something moves. { id: [clashes] }
  const conflicts = conflictsById(tasks)

  const sorted = [...tasks].sort(byTime) // sort() rearranges the array it
  // is given, so sort a copy: the stored list keeps the order you added in.

  return (
    <main className="app">
      <header className="app-header">
        <h1>Dagen</h1>
        <p className="today">
          {formatDay(todayISO(), startedAt)},{' '}
          {startedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
        </p>
      </header>

      {CATEGORIES.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          tasks={sorted.filter((task) => task.categoryId === category.id)}
          allTasks={tasks}
          conflicts={conflicts}
          isCollapsed={collapsed.includes(category.id)}
          onToggleCollapse={toggleCollapse}
          onAdd={addTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
        />
      ))}
    </main>
  )
}

export default App
