/*
  TaskForm.jsx — one panel used for two jobs: adding a task, and editing
  one that exists. Pass it a task and it fills itself in and says "Save";
  pass none and it starts empty on the day you're looking at and says "Add".

  Writing it once means the rules about times can't drift apart between
  an "add" screen and an "edit" screen.
*/

import { useState } from 'react'
import { findConflicts } from '../lib/conflicts.js'
import {
  DURATIONS,
  QUARTER_TIMES,
  addDays,
  endTime,
  formatDuration,
  formatRange,
  makeStart,
  nextQuarter,
  shiftStart,
  splitStart,
} from '../lib/dates.js'

function TaskForm({ categoryName, tasks, task, defaultDay, onSubmit, onCancel }) {
  // When editing, start from the task. When adding, start from sensible
  // defaults. The ...() => shape means this runs once, not on every redraw.
  const [title, setTitle] = useState(() => task?.title ?? '')
  const [day, setDay] = useState(() => (task ? splitStart(task.start).day : defaultDay))
  const [time, setTime] = useState(() =>
    task ? splitStart(task.start).time : nextQuarter(),
  )
  const [durationMin, setDurationMin] = useState(() => task?.durationMin ?? 30)
  const [tentative, setTentative] = useState(() => task?.tentative ?? false)

  const isEditing = Boolean(task)
  const start = makeStart(day, time)

  // The task being edited must not count as clashing with itself, so the
  // draft borrows its id. A new task uses an id no task can have.
  const draft = {
    id: task?.id ?? 'draft',
    start: start,
    durationMin: durationMin,
    status: 'todo',
  }
  const clashes = findConflicts(draft, tasks)

  // The quick chips: move the whole task without touching the fields by hand.
  function shiftBy(minutes) {
    const moved = splitStart(shiftStart(start, minutes))
    setDay(moved.day)
    setTime(moved.time)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return

    onSubmit({
      title: trimmed,
      start: start,
      durationMin: durationMin,
      tentative: tentative,
    })

    if (isEditing) return // the row goes back to normal; nothing to reset

    // Adding: clear the title and move the clock to the end of the task
    // just added, so a run of tasks stacks up naturally.
    setTitle('')
    setTime(endTime(start, durationMin))
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') onCancel()
  }

  const label = isEditing ? `Edit ${task.title}` : `New task in ${categoryName}`

  return (
    <form className="task-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={`Add to ${categoryName}`}
        aria-label={label}
        autoFocus
      />

      <div className="form-row">
        <input
          type="date"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          aria-label="Day"
        />

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
            aria-pressed={option === durationMin}
            className="chip"
            onClick={() => setDurationMin(option)}
          >
            {formatDuration(option)}
          </button>
        ))}
      </div>

      <div className="chips" role="group" aria-label="Move">
        <button type="button" className="chip" onClick={() => shiftBy(15)}>
          +15m
        </button>
        <button type="button" className="chip" onClick={() => shiftBy(60)}>
          +1h
        </button>
        <button type="button" className="chip" onClick={() => setDay(addDays(day, 1))}>
          Tomorrow
        </button>
      </div>

      <p className="form-summary">
        {formatRange(start, durationMin)}
        {clashes.length > 0 && (
          <span className="clash-note">
            {' '}
            ⚠ Overlaps {clashes.map((other) => other.title).join(', ')}
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

        <button type="submit">{isEditing ? 'Save' : 'Add'}</button>
        <button type="button" className="ghost" onClick={onCancel}>
          {isEditing ? 'Cancel' : 'Done'}
        </button>
      </div>
    </form>
  )
}

export default TaskForm
