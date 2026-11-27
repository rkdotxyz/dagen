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
  active Area limit, and rollover.

  Since Phase 15 an Area can have start and end days (they draw its bar
  on the Quarter timeline), and the panel lists your away blocks: trips
  and holidays, when a day has no capacity at all.
*/

import { useState } from 'react'
import { PencilIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { CATEGORIES, getCategory } from '../config.js'
import { awayProblem, describeAway, sortedAway } from '../lib/away.js'
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
  // Optional: when this Area runs, for the Quarter timeline.
  const [startDay, setStartDay] = useState(() => area?.startDay ?? '')
  const [endDay, setEndDay] = useState(() => area?.endDay ?? '')
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

    if (startDay && endDay && endDay < startDay) {
      setError('The end can’t be before the start.')
      return
    }

    setError(null)
    onSubmit({
      name: trimmed,
      categoryId: categoryId,
      status: status,
      monthlyBudgetHours: hours,
      outcome: outcome.trim(),
      startDay: startDay || null,
      endDay: endDay || null,
    })

    if (!area) {
      setName('')
      setOutcome('')
      setStartDay('')
      setEndDay('')
    }
  }

  return (
    // noValidate turns off the browser's own pop-up checks (like min="0"
    // on the hours box), so our messages under the fields are the ones
    // you see, the same on every browser.
    <form className="task-form area-form" onSubmit={handleSubmit} noValidate>
      <Input
        className="field"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Räckvidd (NAVET)"
        aria-label={area ? `Name of ${area.name}` : 'New Area name'}
        autoFocus={Boolean(area)}
      />

      <div className="form-row">
        <NativeSelect
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
        </NativeSelect>

        <NativeSelect
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
        </NativeSelect>

        <Input
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

      <Input
        className="field"
        type="text"
        value={outcome}
        onChange={(event) => setOutcome(event.target.value)}
        placeholder="Outcome this quarter (optional)"
        aria-label="Outcome this quarter"
      />

      <div className="form-row">
        <label className="setting">
          Runs from (optional)
          <Input
            className="field"
            type="date"
            value={startDay}
            onChange={(event) => setStartDay(event.target.value)}
          />
        </label>
        <label className="setting">
          Until (optional)
          <Input
            className="field"
            type="date"
            value={endDay}
            onChange={(event) => setEndDay(event.target.value)}
          />
        </label>
      </div>

      {/* role="alert" makes a screen reader read the problem out. */}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-row">
        <Button type="submit">{area ? 'Save' : 'Add Area'}</Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
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
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            onRemove(area.id)
            setMode('view')
          }}
        >
          Archive
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode('view')}>
          Keep
        </Button>
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdate(area.id, { archived: false })}
          aria-label={`Restore ${area.name}`}
        >
          Restore
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMode('edit')}
            aria-label={`Edit ${area.name}`}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              // In use: ask first. Not in use: nothing is lost, so just go.
              isInUse(area.id, tasks, entries) ? setMode('confirm') : onRemove(area.id)
            }
            aria-label={`Delete ${area.name}`}
          >
            <XIcon />
          </Button>
        </>
      )}
    </li>
  )
}

// The add and edit form for an away block.
function AwayForm({ block, onSave, onCancel }) {
  const [title, setTitle] = useState(() => block?.title ?? '')
  const [startDay, setStartDay] = useState(() => block?.startDay ?? '')
  const [endDay, setEndDay] = useState(() => block?.endDay ?? '')
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    const problem = awayProblem({ title: title, startDay: startDay, endDay: endDay })
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    onSave({ title: title.trim(), startDay: startDay, endDay: endDay })
    if (!block) {
      setTitle('')
      setStartDay('')
      setEndDay('')
    }
  }

  return (
    <form className="task-form area-form" onSubmit={handleSubmit} noValidate>
      <Input
        className="field"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Winter trip"
        aria-label={block ? `Name of ${block.title}` : 'New away block name'}
        autoFocus={Boolean(block)}
      />
      <div className="form-row">
        <label className="setting">
          First day away
          <Input
            className="field"
            type="date"
            value={startDay}
            onChange={(event) => setStartDay(event.target.value)}
          />
        </label>
        <label className="setting">
          Last day away
          <Input
            className="field"
            type="date"
            value={endDay}
            onChange={(event) => setEndDay(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-row">
        <Button type="submit">{block ? 'Save' : 'Add away time'}</Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

// Trips and holidays: days with no capacity at all. They aren't sent to
// Google Calendar.
function AwaySection({ away, onAdd, onChange, onDelete }) {
  const [editingId, setEditingId] = useState(null)

  return (
    <section aria-label="Away">
      <h3 className="panel-subhead">Away</h3>
      {away.length === 0 ? (
        <p className="empty">No trips yet. Days you&apos;re away have no free hours.</p>
      ) : (
        <ul className="template-list">
          {sortedAway(away).map((block) =>
            block.id === editingId ? (
              <li key={block.id} className="area">
                <AwayForm
                  block={block}
                  onSave={(changes) => {
                    onChange(block.id, changes)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={block.id} className="area">
                <span className="area-text">
                  <span>{block.title}</span>
                  <span className="task-when">{describeAway(block)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(block.id)}
                  aria-label={`Edit ${block.title}`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(block.id)}
                  aria-label={`Delete ${block.title}`}
                >
                  <XIcon />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
      <AwayForm onSave={onAdd} />
    </section>
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
  away = [],
  onAddAway,
  onChangeAway,
  onDeleteAway,
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
      <Card className="panel-card">
        <CardHeader>
          <CardTitle>Areas</CardTitle>
          <span className="heading-note">{active} active</span>
        </CardHeader>

        <CardContent>

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
            <NativeSelect
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
            </NativeSelect>
          </label>

          <label className="setting">
            Free hours, weekends
            <NativeSelect
              className="field"
              value={settings.capacity.weekend}
              onChange={(event) => setCapacity('weekend', Number(event.target.value))}
            >
              {HOUR_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours}h
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="setting">
            Active Area limit
            <NativeSelect
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
            </NativeSelect>
          </label>
        </div>

        {/* This switch isn't inside a <form>, so wrapping it in the label
            is enough to make the words clickable. */}
        <label className="tentative-toggle">
          <Switch
            checked={settings.rolloverEnabled}
            onCheckedChange={(checked) =>
              onChangeSettings({ ...settings, rolloverEnabled: checked })
            }
          />
          Offer to roll over unfinished tasks each morning
        </label>

        <AwaySection
          away={away}
          onAdd={onAddAway}
          onChange={onChangeAway}
          onDelete={onDeleteAway}
        />
        </CardContent>
      </Card>
    </section>
  )
}

export default AreasPanel
