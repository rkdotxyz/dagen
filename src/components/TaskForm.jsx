/*
  TaskForm.jsx — the add panel inside a category section.

  Four decisions, in the order you make them: what, when, how long, and
  is the time firm. The day starts as today and the time as the next
  quarter hour, so most tasks need only a title and a tap on Add.

  While you choose, it checks the time against your other tasks and shows
  what it would clash with. It never blocks you: a clash is information.
*/

import { useState } from 'react'
import { findConflicts } from '../lib/conflicts.js'
import {
  DURATIONS,
  QUARTER_TIMES,
  endTime,
  formatDuration,
  formatRange,
  makeStart,
  nextQuarter,
  todayISO,
} from '../lib/dates.js'

function TaskForm({ categoryName, tasks, onAdd, onCancel }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(() => todayISO())
  const [time, setTime] = useState(() => nextQuarter())
  const [durationMin, setDurationMin] = useState(30)
  const [tentative, setTentative] = useState(false)

  const start = makeStart(day, time)

  // A pretend task, so the same rule that flags saved tasks can check
  // this one before it exists. The id can be anything no task has.
  const draft = { id: 'draft', start: start, durationMin: durationMin, status: 'todo' }
  const clashes = findConflicts(draft, tasks)

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return

    onAdd({
      title: trimmed,
      start: start,
      durationMin: durationMin,
      tentative: tentative,
    })

    // Ready for the next task: clear the title and move the clock to the
    // end of the one just added, so a run of tasks stacks up naturally.
    setTitle('')
    setTime(endTime(start, durationMin))
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') onCancel()
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={`Add to ${categoryName}`}
        aria-label={`New task in ${categoryName}`}
        autoFocus
      />

      <div className="form-row">
        {/* type="date" gives you the browser's own date picker, and on a
            phone the native one. Its value is already "YYYY-MM-DD". */}
        <input
          type="date"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          aria-label="Day"
        />

        {/* A plain list of the 96 quarter hours, rather than type="time",
            so nothing off the quarter can be typed in. */}
        <select
          value={time}
          onChange={(event) => setTime(event.target.value)}
          aria-label="Start time"
        >
          {QUARTER_TIMES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="chips" role="group" aria-label="Duration">
        {DURATIONS.map((option) => (
          <button
            key={option}
            type="button"
            // aria-pressed marks the chosen chip for screen readers, and
            // the CSS uses it to highlight it. One attribute, two jobs.
            aria-pressed={option === durationMin}
            className="chip"
            onClick={() => setDurationMin(option)}
          >
            {formatDuration(option)}
          </button>
        ))}
      </div>

      <p className="form-summary">
        {formatRange(start, durationMin)}
        {clashes.length > 0 && (
          <span className="clash-note">
            {' '}
            ⚠ Overlaps {clashes.map((task) => task.title).join(', ')}
          </span>
        )}
      </p>

      <div className="form-row">
        <label className="tentative-toggle">
          <input
            type="checkbox"
            checked={tentative}
            onChange={(event) => setTentative(event.target.checked)}
          />
          Tentative
        </label>

        <button type="submit">Add</button>
        <button type="button" className="ghost" onClick={onCancel}>
          Done
        </button>
      </div>
    </form>
  )
}

export default TaskForm
