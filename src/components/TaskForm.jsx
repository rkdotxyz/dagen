/*
  TaskForm.jsx — one panel used for two jobs: adding a task, and editing
  one that exists. Pass it a task and it fills itself in and says "Save";
  pass none and it starts empty on the day you're looking at and says "Add".

  Since Phase 10 every field is a drawably control. They are the same
  <input>, <select> and <button> elements as before with a sketch layered
  behind, which is why the logic below didn't change at all.
*/

import { useState } from 'react'
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyInput,
  DrawablySelect,
  DrawablyToggle,
} from 'drawably/react'
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
  const [title, setTitle] = useState(() => task?.title ?? '')
  const [day, setDay] = useState(() => (task ? splitStart(task.start).day : defaultDay))
  const [time, setTime] = useState(() =>
    task ? splitStart(task.start).time : nextQuarter(),
  )
  const [durationMin, setDurationMin] = useState(() => task?.durationMin ?? 30)
  const [tentative, setTentative] = useState(() => task?.tentative ?? false)

  const isEditing = Boolean(task)
  const start = makeStart(day, time)

  const draft = {
    id: task?.id ?? 'draft',
    start: start,
    durationMin: durationMin,
    status: 'todo',
  }
  const clashes = findConflicts(draft, tasks)

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

    if (isEditing) return

    setTitle('')
    setTime(endTime(start, durationMin))
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') onCancel()
  }

  const label = isEditing ? `Edit ${task.title}` : `New task in ${categoryName}`

  return (
    // The card is the sketched frame; the form inside it does the work.
    <DrawablyCard className="form-card">
      <form className="task-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <DrawablyInput
          className="field"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={`Add to ${categoryName}`}
          aria-label={label}
          autoFocus
        />

        <div className="form-row">
          <DrawablyInput
            className="field"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-label="Day"
          />

          <DrawablySelect
            className="field"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Start time"
          >
            {QUARTER_TIMES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </DrawablySelect>
        </div>

        {/* The chosen duration is drawn "solid", the others in outline.
            Changing the variant makes drawably sketch that chip afresh,
            which reads nicely as the pen filling it in. */}
        <div className="chips" role="group" aria-label="Duration">
          {DURATIONS.map((option) => (
            <DrawablyButton
              key={option}
              variant={option === durationMin ? 'solid' : 'outline'}
              aria-pressed={option === durationMin}
              className="chip"
              onClick={() => setDurationMin(option)}
            >
              {formatDuration(option)}
            </DrawablyButton>
          ))}
        </div>

        <div className="chips" role="group" aria-label="Move">
          <DrawablyButton className="chip" onClick={() => shiftBy(15)}>
            +15m
          </DrawablyButton>
          <DrawablyButton className="chip" onClick={() => shiftBy(60)}>
            +1h
          </DrawablyButton>
          <DrawablyButton className="chip" onClick={() => setDay(addDays(day, 1))}>
            Tomorrow
          </DrawablyButton>
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
          {/* A sketched switch. Underneath it is still a checkbox, with
              role="switch" so screen readers announce it as on or off. */}
          <label className="tentative-toggle">
            <DrawablyToggle
              checked={tentative}
              onChange={(event) => setTentative(event.target.checked)}
            />
            Tentative
          </label>

          <DrawablyButton type="submit" variant="solid">
            {isEditing ? 'Save' : 'Add'}
          </DrawablyButton>
          <DrawablyButton onClick={onCancel}>
            {isEditing ? 'Cancel' : 'Done'}
          </DrawablyButton>
        </div>
      </form>
    </DrawablyCard>
  )
}

export default TaskForm
