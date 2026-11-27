/*
  AreasPanel.jsx — your Areas, and the settings that go with them.

  An Area is one thing you're involved in (a course, a project, the
  internship search). This panel lists them with their status, monthly
  hour budget and when you last worked on them, and lets you add, edit
  and remove them.

  Removing is careful: an Area that tasks or tracked time still point at
  is ARCHIVED, after a second tap to confirm, so its history keeps a name.
  An unused one is simply deleted. The rules are in lib/areas.js; this
  file only draws and reports.

  Below the list are the planner's settings: free hours per day, the
  active Area limit, and rollover. Later phases put them to work.
*/

import { useState } from 'react'
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyInput,
  DrawablySelect,
  DrawablyToggle,
} from 'drawably/react'
import { CATEGORIES, getCategory } from '../config.js'
import {
  AREA_STATUSES,
  STATUS_NAMES,
  activeCount,
  formatLastWorked,
  isInUse,
  lastWorkedOn,
} from '../lib/areas.js'

// Half-hour steps from 0 to 16 hours, for the free-hours lists.
const HOUR_OPTIONS = Array.from({ length: 33 }, (_, index) => index / 2)
const LIMIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// The add and edit form for one Area. It keeps its own text while you
// type, and only hands a finished Area upwards when you save.
function AreaForm({ area, onSubmit, onCancel }) {
  const [name, setName] = useState(() => area?.name ?? '')
  const [categoryId, setCategoryId] = useState(() => area?.categoryId ?? 'projects')
  const [status, setStatus] = useState(() => area?.status ?? 'active')
  // Kept as text: a number box can be empty for a moment while you type.
  const [budget, setBudget] = useState(() => String(area?.monthlyBudgetHours ?? 0))
  const [outcome, setOutcome] = useState(() => area?.outcome ?? '')
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()

    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Add a name first.')
      return
    }

    const hours = Number(budget)
    if (budget.trim() === '' || !Number.isFinite(hours) || hours < 0) {
      setError('Hours per month must be 0 or more.')
      return
    }

    setError(null)
    onSubmit({
      name: trimmed,
      categoryId: categoryId,
      status: status,
      monthlyBudgetHours: hours,
      outcome: outcome.trim(),
    })

    if (!area) {
      setName('')
      setOutcome('')
    }
  }

  return (
    // noValidate turns off the browser's own pop-up checks (like min="0"
    // on the hours box), so our messages under the fields are the ones
    // you see, the same on every browser.
    <form className="task-form area-form" onSubmit={handleSubmit} noValidate>
      <DrawablyInput
        className="field"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Räckvidd (NAVET)"
        aria-label={area ? `Name of ${area.name}` : 'New Area name'}
        autoFocus={Boolean(area)}
      />

      <div className="form-row">
        <DrawablySelect
          className="field"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Area category"
        >
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </DrawablySelect>

        <DrawablySelect
          className="field"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Status"
        >
          {AREA_STATUSES.map((option) => (
            <option key={option} value={option}>
              {STATUS_NAMES[option]}
            </option>
          ))}
        </DrawablySelect>

        <DrawablyInput
          className="field budget-field"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          aria-label="Hours per month"
        />
      </div>

      <DrawablyInput
        className="field"
        type="text"
        value={outcome}
        onChange={(event) => setOutcome(event.target.value)}
        placeholder="Outcome this quarter (optional)"
        aria-label="Outcome this quarter"
      />

      {/* role="alert" makes a screen reader read the problem out. */}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-row">
        <DrawablyButton type="submit" variant="solid">
          {area ? 'Save' : 'Add Area'}
        </DrawablyButton>
        {onCancel && <DrawablyButton onClick={onCancel}>Cancel</DrawablyButton>}
      </div>
    </form>
  )
}

// One row of the table, or its edit form, or its "are you sure?" line.
function AreaRow({ area, tasks, entries, onUpdate, onRemove }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirm'

  const category = getCategory(area.categoryId)
  const taskCount = tasks.filter((task) => task.areaId === area.id).length
  const usedBy =
    taskCount > 0 ? `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}` : 'tracked time'

  if (mode === 'edit') {
    return (
      <li className="area">
        <AreaForm
          area={area}
          onSubmit={(changes) => {
            onUpdate(area.id, changes)
            setMode('view')
          }}
          onCancel={() => setMode('view')}
        />
      </li>
    )
  }

  // The second step of removing an Area that's still in use.
  if (mode === 'confirm') {
    return (
      <li className="area confirm">
        <span className="area-text">
          {area.name} still has {usedBy}. Archive it? Its history stays.
        </span>
        <DrawablyButton
          className="row-button"
          tone="danger"
          onClick={() => {
            onRemove(area.id)
            setMode('view')
          }}
        >
          Archive
        </DrawablyButton>
        <DrawablyButton className="row-button" onClick={() => setMode('view')}>
          Keep
        </DrawablyButton>
      </li>
    )
  }

  return (
    <li className={area.archived ? 'area archived' : 'area'}>
      <span className="dot" style={{ backgroundColor: category.hex }} />
      <span className="area-text">
        <span>{area.name}</span>
        <span className="task-when">
          {area.archived ? 'Archived' : STATUS_NAMES[area.status]} ·{' '}
          {area.monthlyBudgetHours}h/month · last worked{' '}
          {formatLastWorked(lastWorkedOn(area.id, entries))}
        </span>
      </span>

      {area.archived ? (
        <DrawablyButton
          className="row-button"
          onClick={() => onUpdate(area.id, { archived: false })}
          aria-label={`Restore ${area.name}`}
        >
          restore
        </DrawablyButton>
      ) : (
        <>
          <DrawablyButton
            className="row-button"
            onClick={() => setMode('edit')}
            aria-label={`Edit ${area.name}`}
          >
            edit
          </DrawablyButton>
          <DrawablyButton
            className="row-button"
            tone="danger"
            onClick={() =>
              // In use: ask first. Not in use: nothing is lost, so just go.
              isInUse(area.id, tasks, entries) ? setMode('confirm') : onRemove(area.id)
            }
            aria-label={`Delete ${area.name}`}
          >
            x
          </DrawablyButton>
        </>
      )}
    </li>
  )
}

function AreasPanel({
  areas,
  tasks,
  entries,
  settings,
  onAdd,
  onUpdate,
  onRemove,
  onChangeSettings,
}) {
  const live = areas.filter((area) => !area.archived)
  const archived = areas.filter((area) => area.archived)
  const active = activeCount(areas)

  // Changes one setting and keeps the rest. Capacity is one level deeper.
  function setCapacity(kind, hours) {
    onChangeSettings({ ...settings, capacity: { ...settings.capacity, [kind]: hours } })
  }

  return (
    <section className="templates areas" aria-label="Areas">
      <DrawablyCard className="panel-card">
        <h2>
          Areas <span className="heading-note">{active} active</span>
        </h2>

        {/* A warning, never a block: sometimes six things really are on. */}
        {active > settings.activeAreaLimit && (
          <p className="clash-note">
            ⚠ {active} active Areas, more than your limit of {settings.activeAreaLimit}.
            Could one be on maintain?
          </p>
        )}

        {live.length === 0 ? (
          <p className="empty">
            No Areas yet. Add the things you&apos;re involved in: a course, a project,
            the job search.
          </p>
        ) : (
          <ul className="template-list">
            {live.map((area) => (
              <AreaRow
                key={area.id}
                area={area}
                tasks={tasks}
                entries={entries}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}

        <AreaForm onSubmit={onAdd} />

        {archived.length > 0 && (
          <>
            <h3 className="panel-subhead">Archived</h3>
            <ul className="template-list">
              {archived.map((area) => (
                <AreaRow
                  key={area.id}
                  area={area}
                  tasks={tasks}
                  entries={entries}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </>
        )}

        <h3 className="panel-subhead">Settings</h3>
        <div className="form-row settings-row">
          <label className="setting">
            Free hours, weekdays
            <DrawablySelect
              className="field"
              value={settings.capacity.weekday}
              // Number(...) because a <select> always hands back text.
              onChange={(event) => setCapacity('weekday', Number(event.target.value))}
            >
              {HOUR_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours}h
                </option>
              ))}
            </DrawablySelect>
          </label>

          <label className="setting">
            Free hours, weekends
            <DrawablySelect
              className="field"
              value={settings.capacity.weekend}
              onChange={(event) => setCapacity('weekend', Number(event.target.value))}
            >
              {HOUR_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours}h
                </option>
              ))}
            </DrawablySelect>
          </label>

          <label className="setting">
            Active Area limit
            <DrawablySelect
              className="field"
              value={settings.activeAreaLimit}
              onChange={(event) =>
                onChangeSettings({ ...settings, activeAreaLimit: Number(event.target.value) })
              }
            >
              {LIMIT_OPTIONS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </DrawablySelect>
          </label>
        </div>

        <label className="tentative-toggle">
          <DrawablyToggle
            checked={settings.rolloverEnabled}
            onChange={(event) =>
              onChangeSettings({ ...settings, rolloverEnabled: event.target.checked })
            }
          />
          Offer to roll over unfinished tasks each morning
        </label>

        <p className="form-summary">
          Free hours and rollover start working with the Week view (next phase).
        </p>
      </DrawablyCard>
    </section>
  )
}

export default AreasPanel
