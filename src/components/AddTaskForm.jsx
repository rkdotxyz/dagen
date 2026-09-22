/*
  AddTaskForm.jsx — the text box and button for adding a task.

  It keeps track of what you're typing (its own small piece of state)
  and, when you submit, hands the title to App through onAdd.
  It doesn't know where tasks are stored; that's App's job.
*/

import { useState } from 'react'

// onAdd is a function App passes in: "call this with the new title".
function AddTaskForm({ onAdd }) {
  // State: a value React remembers between redraws.
  // title = current text; setTitle = the only way to change it.
  // '' (empty text) is the starting value.
  const [title, setTitle] = useState('')

  // Runs when the form is submitted: clicking Add or pressing Enter.
  function handleSubmit(event) {
    // Browsers reload the page when a form is submitted.
    // preventDefault() stops that, so React stays in charge.
    event.preventDefault()

    // trim() removes spaces at the start and end: "  Laundry " -> "Laundry"
    const trimmed = title.trim()
    if (trimmed === '') return // ignore empty tasks

    onAdd(trimmed) // tell App about the new task
    setTitle('') // clear the box for the next one
  }

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      {/* A "controlled input": its text always comes from state (value),
          and every keystroke updates state (onChange). */}
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task"
        aria-label="Task name"
      />
      <button type="submit">Add</button>
    </form>
  )
}

export default AddTaskForm
