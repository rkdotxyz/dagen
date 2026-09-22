/*
  App.jsx — the main component of Dagen.

  Step 1: show a list of tasks from a fixed ("hard-coded") array.
  Nothing can change yet; that needs state, which arrives in step 2.
*/

// Borrow the TaskItem component from its own file.
import TaskItem from './components/TaskItem.jsx'

// A fixed list for now. Each task is an object: a set of named values.
// The shape matches the plan: id, title and status. More fields come later.
const sampleTasks = [
  { id: 't1', title: 'Laundry', status: 'todo' },
  { id: 't2', title: 'Cook dinner', status: 'todo' },
  { id: 't3', title: 'Read DM2601 notes', status: 'done' },
]

function App() {
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

      {/* <ul> is an unordered list. For every task in the array,
          .map() makes one <TaskItem>. "key" is a unique label React
          uses to tell the rows apart when the list changes. */}
      <ul className="task-list">
        {sampleTasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </main>
  )
}

export default App
