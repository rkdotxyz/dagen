/*
  AddTaskForm.jsx — the little text box inside a category section.

  It doesn't know which category it belongs to; it only knows the name to
  show and who to tell when a task is typed. The section it sits in
  handles the rest.
*/

import { useState } from 'react'

function AddTaskForm({ categoryName, onAdd, onCancel }) {
  const [title, setTitle] = useState('')

  function handleSubmit(event) {
    event.preventDefault() // stop the browser reloading the page
    const trimmed = title.trim()
    if (trimmed === '') return

    onAdd(trimmed)
    setTitle('') // ready for the next one, so you can add several in a row
  }

  function handleKeyDown(event) {
    // Escape closes the box without adding anything.
    if (event.key === 'Escape') onCancel()
  }

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Add to ${categoryName}`}
        aria-label={`New task in ${categoryName}`}
        // autoFocus puts the cursor in the box as soon as it appears,
        // so you can tap + and start typing.
        autoFocus
      />
      <button type="submit">Add</button>
      <button type="button" className="ghost" onClick={onCancel}>
        Done
      </button>
    </form>
  )
}

export default AddTaskForm
