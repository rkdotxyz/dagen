/*
  App.jsx — the main component of Dagen.

  App owns everything that must survive a redraw: the tasks and the list
  of collapsed sections. It hands each category section the tasks that
  belong to it, and the sections report back what you did.
*/

import { useEffect, useState } from 'react'
import CategorySection from './components/CategorySection.jsx'
import { CATEGORIES } from './config.js'
import {
  loadCollapsed,
  loadTasks,
  saveCollapsed,
  saveTasks,
} from './lib/storage.js'

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function App() {
  const [tasks, setTasks] = useState(() => loadTasks())
  // The ids of the sections you've folded, e.g. ["chores"].
  const [collapsed, setCollapsed] = useState(() => loadCollapsed())

  // Save whenever either one changes. Two separate effects, because they
  // watch different things and write to different places.
  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  function addTask(categoryId, title) {
    const newTask = { id: makeId(), title: title, categoryId: categoryId, status: 'todo' }
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
    // .includes() asks "is this id in the list?"
    setCollapsed(
      collapsed.includes(categoryId)
        ? collapsed.filter((id) => id !== categoryId) // unfold
        : [...collapsed, categoryId], // fold
    )
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="app">
      <header className="app-header">
        <h1>Dagen</h1>
        <p className="today">{today}</p>
      </header>

      {/* One section per category, always in the same order: the order
          they appear in config.js. Each gets only its own tasks. */}
      {CATEGORIES.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          tasks={tasks.filter((task) => task.categoryId === category.id)}
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
