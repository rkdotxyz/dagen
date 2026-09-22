/*
  App.jsx — the main component of Dagen.

  Step 2: the task list is now STATE, so it can change.
  App owns the list. The form and the rows only report what happened
  (add, toggle, delete); App decides how the list changes.
*/

import { useState } from 'react'
import AddTaskForm from './components/AddTaskForm.jsx'
import TaskItem from './components/TaskItem.jsx'

// Makes a short unique id, e.g. "mfk3x2a9q1".
// Date.now() = milliseconds since 1970, written in base 36 to keep it short,
// plus a few random characters in case two tasks are added in the same millisecond.
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function App() {
  // The list of tasks, starting empty. setTasks replaces it with a new list.
  const [tasks, setTasks] = useState([])

  function addTask(title) {
    const newTask = { id: makeId(), title: title, status: 'todo' }
    // [...tasks, newTask] = a NEW array: all old tasks, then the new one.
    // React only notices a change when it gets a new array, so we never
    // push into the old one.
    setTasks([...tasks, newTask])
  }

  function toggleTask(id) {
    // .map() builds a new array the same length. The matching task is
    // copied with its status flipped ({ ...task, status: ... });
    // every other task passes through unchanged.
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
          : task,
      ),
    )
  }

  function deleteTask(id) {
    // .filter() keeps only the tasks whose id is NOT the one to delete.
    setTasks(tasks.filter((task) => task.id !== id))
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Worked out from state on every redraw, never stored separately,
  // so it can't get out of date.
  const remaining = tasks.filter((task) => task.status !== 'done').length

  return (
    <main className="app">
      <header className="app-header">
        <h1>Dagen</h1>
        <p className="today">{today}</p>
      </header>

      {/* Pass the addTask function down as a prop called onAdd. */}
      <AddTaskForm onAdd={addTask} />

      {/* condition ? A : B  =  "if the list is empty show A, otherwise B" */}
      {tasks.length === 0 ? (
        <p className="empty">No tasks yet. Add one above.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          ))}
        </ul>
      )}

      {/* condition && A  =  "show A only if the condition is true" */}
      {tasks.length > 0 && (
        <p className="count">
          {remaining} of {tasks.length} left
        </p>
      )}
    </main>
  )
}

export default App
