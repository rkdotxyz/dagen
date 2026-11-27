/*
  TaskForm.jsx — one panel used for two jobs: adding a task, and editing
  one that exists. Pass it a task and it fills itself in and says "Save";
  pass none and it starts empty on the day you're looking at and says "Add".

  Since Phase 11 a task doesn't need a day or a time:
    - "Any time" in the time list keeps it on the day with no hour
    - "No day yet" leaves it unplaced, waiting in the To place list
  It can also belong to an Area. Picking an Area sets the category too,
  because an Area lives inside one category.

  Every field is a drawably control: the same <input>, <select> and
  <button> elements as before, with a sketch layered behind.
*/

import { useState } from 'react'
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyInput,
  DrawablySelect,
  DrawablyToggle,
} from 'drawably/react'
import { CATEGORIES } from '../config.js'
import { findArea, liveAreas } from '../lib/areas.js'
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
  todayISO,
} from '../lib/dates.js'
import { dayOf, timeOf } from '../lib/placement.js'

// The options of the Area list, grouped by category. An archived Area
// is only offered if this task already belongs to it, so editing an old
// task doesn't quietly drop its Area.
function areaGroups(areas, currentAreaId) {
  const offered = areas.filter((area) => !area.archived || area.id === currentAreaId)

  return CATEGORIES.map((category) => ({
    category: category,
    areas: offered.filter((area) => area.categoryId === category.id),
  })).filter((group) => group.areas.length > 0)
}

function TaskForm({
  categoryId,
  categoryName,
  areas = [],
  tasks,
  task,
  defaultDay,
  onSubmit,
  onCancel,
}) {
  const [title, setTitle] = useState(() => task?.title ?? '')
  // An empty text means "none": no day yet, or any time on the day.
  const [day, setDay] = useState(() => (task ? (dayOf(task) ?? '') : defaultDay))
  const [time, setTime] = useState(() => (task ? (timeOf(task) ?? '') : nextQuarter()))
  const [durationMin, setDurationMin] = useState(() => task?.durationMin ?? 30)
  const [tentative, setTentative] = useState(() => task?.tentative ?? false)
  const [areaId, setAreaId] = useState(() => task?.areaId ?? '')

  const isEditing = Boolean(task)
  // A start only exists when there's both a day and a time.
  const start = day && time ? makeStart(day, time) : null

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

    const area = findArea(areas, areaId)

    onSubmit({
      title: trimmed,
      start: start,
      day: day || null,
      durationMin: durationMin,
      tentative: tentative,
      areaId: area ? area.id : null,
      // The Area decides the category. With no Area, the task stays in
      // the section it was added from.
      categoryId: area ? area.categoryId : (task?.categoryId ?? categoryId),
    })

    if (isEditing) return

    setTitle('')
    // Lining up the next task only makes sense after a timed one.
    if (start) setTime(endTime(start, durationMin))
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') onCancel()
  }

  const label = isEditing ? `Edit ${task.title}` : `New task in ${categoryName}`

  // What this task will be, in words, under the fields.
  let summary = `No day yet · ${formatDuration(durationMin)} · waits in To place`
  if (start) summary = formatRange(start, durationMin)
  else if (day) summary = `Any time · ${formatDuration(durationMin)}`

  const groups = areaGroups(areas, task?.areaId)

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

        {/* Only shown once you have an Area, so a brand-new planner looks
            exactly as it did before Phase 11. */}
        {liveAreas(areas).length > 0 || task?.areaId ? (
          <DrawablySelect
            className="field"
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            aria-label="Area"
          >
            <option value="">No Area</option>
            {/* <optgroup> draws a heading inside the list for each
                category, which is the "grouped by category" in the spec. */}
            {groups.map((group) => (
              <optgroup key={group.category.id} label={group.category.name}>
                {group.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.archived ? `${area.name} (archived)` : area.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </DrawablySelect>
        ) : null}

        <div className="form-row">
          <DrawablyInput
            className="field"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-label="Day"
          />

          {/* Without a day there's nothing for a time to belong to, so the
              list is switched off until a day is picked. */}
          <DrawablySelect
            className="field"
            // With no day it reads "Any time", rather than showing a
            // time that won't be used. The chosen time comes back if you
            // pick a day again.
            value={day ? time : ''}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Start time"
            disabled={!day}
          >
            <option value="">Any time</option>
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

        {/* +15m and +1h move a time, so they only work on a timed task. */}
        <div className="chips" role="group" aria-label="Move">
          <DrawablyButton className="chip" onClick={() => shiftBy(15)} disabled={!start}>
            +15m
          </DrawablyButton>
          <DrawablyButton className="chip" onClick={() => shiftBy(60)} disabled={!start}>
            +1h
          </DrawablyButton>
          <DrawablyButton
            className="chip"
            onClick={() => setDay(addDays(day || todayISO(), 1))}
          >
            Tomorrow
          </DrawablyButton>
          <DrawablyButton
            className="chip"
            variant={day ? 'outline' : 'solid'}
            aria-pressed={!day}
            onClick={() => setDay('')}
          >
            No day yet
          </DrawablyButton>
        </div>

        <p className="form-summary">
          {summary}
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
