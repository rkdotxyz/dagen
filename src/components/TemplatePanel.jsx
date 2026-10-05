/*
  TemplatePanel.jsx — the list of recurring chores, and the form to add one.

  A template is a rule: what, where, how often, when and for how long.
  Nothing here knows how the rules turn into tasks; that's recurring.js.

  The whole panel is a sketched card, and its fields are drawably's.
*/

import { useState } from 'react'
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyInput,
  DrawablySelect,
} from 'drawably/react'
import { CATEGORIES, getCategory } from '../config.js'
import { DURATIONS, QUARTER_TIMES, WEEKDAY_NAMES, formatDuration } from '../lib/dates.js'

// Describes a rule in words: "Daily at 18:00 · 1h" or "Every Saturday…".
function describe(template) {
  const when =
    template.repeat === 'daily' ? 'Daily' : `Every ${WEEKDAY_NAMES[template.weekday]}`

  return `${when} at ${template.time} · ${formatDuration(template.durationMin)}`
}

function TemplatePanel({ templates, onAdd, onDelete }) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [repeat, setRepeat] = useState('daily')
  const [weekday, setWeekday] = useState(0)
  const [time, setTime] = useState('18:00')
  const [durationMin, setDurationMin] = useState(30)

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return

    onAdd({
      title: trimmed,
      categoryId: categoryId,
      repeat: repeat,
      // Number(...) because a <select> always hands back text, even "0".
      weekday: Number(weekday),
      time: time,
      durationMin: durationMin,
    })

    setTitle('')
  }

  return (
    <section className="templates" aria-label="Recurring chores">
      <DrawablyCard className="panel-card">
        <h2>Recurring chores</h2>

        {templates.length === 0 ? (
          <p className="empty">
            No recurring chores yet. Add one and it will appear on every day it is due.
          </p>
        ) : (
          <ul className="template-list">
            {templates.map((template) => (
              <li key={template.id} className="template">
                <span
                  className="dot"
                  style={{ backgroundColor: getCategory(template.categoryId).hex }}
                />
                <span className="template-text">
                  <span>{template.title}</span>
                  <span className="task-when">{describe(template)}</span>
                </span>
                <DrawablyButton
                  className="row-button"
                  tone="danger"
                  onClick={() => onDelete(template.id)}
                  aria-label={`Delete the ${template.title} chore`}
                >
                  x
                </DrawablyButton>
              </li>
            ))}
          </ul>
        )}

        <form className="task-form" onSubmit={handleSubmit}>
          <DrawablyInput
            className="field"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Cook dinner"
            aria-label="Chore name"
          />

          <div className="form-row">
            <DrawablySelect
              className="field"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              aria-label="Category"
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </DrawablySelect>

            <DrawablySelect
              className="field"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              aria-label="How often"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </DrawablySelect>

            {/* The weekday only matters for a weekly chore, so it only
              appears when one is chosen. */}
            {repeat === 'weekly' && (
              <DrawablySelect
                className="field"
                value={weekday}
                onChange={(event) => setWeekday(event.target.value)}
                aria-label="Weekday"
              >
                {WEEKDAY_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </DrawablySelect>
            )}

            <DrawablySelect
              className="field"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label="Chore time"
            >
              {QUARTER_TIMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </DrawablySelect>
          </div>

          <div className="chips" role="group" aria-label="Chore duration">
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

          <div className="form-row">
            <DrawablyButton type="submit" variant="solid">
              Add chore
            </DrawablyButton>
          </div>
        </form>
      </DrawablyCard>
    </section>
  )
}

export default TemplatePanel
