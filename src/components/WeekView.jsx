/*
  WeekView.jsx — the main planning screen: one week, seven days.

  At the top, the finding: "Week 48 has 6h of slack" or "Thursday is
  overpacked", with the dates, fixed and planned hours, and clashes below.

  Then the seven days: stacked cards on a phone, side-by-side columns on a
  wide screen (they scroll sideways inside their own box, never the page).
  Each day shows its free hours, then everything on it in time order, with
  "any time" tasks last. Fixed things (fixed tasks and busy events from
  your calendars) carry a lock and a solid edge, so they read differently
  without relying on colour. Today gets a thin "now" line.

  Beside the days (below them on a phone): this week's priorities, and the
  To place list.

  On a computer you can drag a task from To place onto a day, or from one
  day to another. Dropped on a day, a task keeps its time if it had one,
  otherwise it goes in as "any time". On a phone, "Place on…" does the job.

  All the sums come from capacity.js and planning.js.
*/

import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, PlayIcon, StarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { getCategory } from '../config.js'
import { findArea } from '../lib/areas.js'
import { daySummary, isFixedItem, weekSummary } from '../lib/capacity.js'
import {
  formatDay,
  formatDuration,
  formatRange,
  formatShortDay,
  toMinutes,
  weekDays,
} from '../lib/dates.js'
import { dayOf, timeOf } from '../lib/placement.js'
import { clashCount, freeNote, weekHeadline, weekPriorities, weekSubline } from '../lib/planning.js'
import TaskForm from './TaskForm.jsx'
import { TaskPills, TitleIcons } from './TaskMarks.jsx'
import ToPlaceSection from './ToPlaceSection.jsx'

// Timed things in clock order, then "any time" ones.
function byClock(a, b) {
  const first = timeOf(a)
  const second = timeOf(b)
  if (first === second) return 0
  if (first === null) return 1
  if (second === null) return -1
  return toMinutes(first) - toMinutes(second)
}

// Where the "now" line goes in today's list: before the first timed item
// that hasn't started yet. Returns that item's index, or the count of
// timed items if everything has started.
function nowIndex(items, nowMinutes) {
  const timed = items.filter((item) => timeOf(item) !== null)
  const next = timed.findIndex((item) => toMinutes(timeOf(item)) > nowMinutes)
  return next === -1 ? timed.length : next
}

// One thing on a day: a task you can tick and edit, or a busy event.
function WeekItem({ item, area, conflicts, today, timer, onToggle, onEdit, onDragStart }) {
  const isBusy = Boolean(item.external)
  const isDone = item.status === 'done'
  const when = item.start ? formatRange(item.start, item.durationMin) : 'any time'

  const classNames = [
    'week-item',
    isFixedItem(item) && 'is-fixed',
    isDone && 'done',
    conflicts.length > 0 && 'clash',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={classNames}
      draggable={!isBusy || undefined}
      onDragStart={isBusy ? undefined : (event) => onDragStart(event, item)}
    >
      {isBusy ? (
        <LockIcon className="title-icon" aria-label="Fixed" role="img" />
      ) : (
        <Checkbox
          checked={isDone}
          onCheckedChange={() => onToggle(item.id)}
          aria-label={`Done: ${item.title}`}
        />
      )}

      {/* Busy events come from your calendar and can't be edited here, so
          they're plain text. Tasks are a button that opens the form. */}
      {isBusy ? (
        <span className="week-item-text">
          <span className="week-item-title">{item.title}</span>
          <span className="task-when">{when} · from your calendar</span>
        </span>
      ) : (
        <button
          type="button"
          className="week-item-text"
          onClick={() => onEdit(item.id)}
          aria-label={`Edit ${item.title}`}
        >
          <span className="week-item-title">
            <TitleIcons task={item} />
            {item.title}
          </span>
          <span className="task-when">
            {when}
            {item.start ? '' : ` · ${formatDuration(item.durationMin)}`}
            {area && ` · ${area.name}`}
            {conflicts.length > 0 && <span className="clash-note"> · ⚠ clash</span>}
          </span>
          <TaskPills task={item} today={today} />
        </button>
      )}

      {/* ▶ starts this task's timer (Phase 13). It sits on its own line
          under the title, so narrow columns keep their width for words. */}
      {!isBusy && timer && (timer.runningTaskId === item.id || !isDone) && (
        <div className="week-item-actions">
          {timer.runningTaskId === item.id ? (
            <Badge className="running-badge">running</Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => timer.onStart(item)}
              aria-label={`Start ${item.title}`}
            >
              <PlayIcon />
              Start
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function DayCard({
  day,
  today,
  summary,
  items,
  areas,
  allTasks,
  conflicts,
  timer,
  editingId,
  onEdit,
  onStopEditing,
  onOpenDay,
  onUpdateTask,
  onToggleTask,
  onDragStart,
  onDropOnDay,
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isToday = day === today
  const over = summary.free < -0.01
  const label = formatDay(day, new Date(`${today}T12:00`))

  const now = new Date()
  const lineAt = isToday ? nowIndex(items, now.getHours() * 60 + now.getMinutes()) : -1
  // The timed items' ids in order: the "now" line goes before the one at
  // position lineAt, or after them all when lineAt is past the end.
  const timedIds = items.filter((item) => timeOf(item) !== null).map((item) => item.id)

  return (
    <Card
      className={[
        'day-card gap-2 px-3 py-3',
        isToday && 'today',
        over && 'over',
        summary.away && 'away',
        isDragOver && 'drag-over',
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label={formatShortDay(day)}
      onDragOver={(event) => {
        if (summary.away) return
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragOver(false)
        const id = event.dataTransfer.getData('text/plain')
        if (id) onDropOnDay(id, day)
      }}
    >
      <div className="day-card-head">
        <button
          type="button"
          className="day-card-name"
          onClick={() => onOpenDay(day)}
          aria-label={`Open ${label}`}
        >
          {formatShortDay(day)}
        </button>
        <span className={over ? 'day-card-free clash-note' : 'day-card-free'}>
          {freeNote(summary)}
        </span>
      </div>

      {summary.away ? (
        // The lid is on: nothing gets planned on a day you're away.
        <p className="away-note">Away · {summary.away.title}</p>
      ) : items.length === 0 ? (
        <p className="empty">Nothing yet.</p>
      ) : (
        <ul className="week-items">
          {items.map((item) => {
            const showLine = lineAt >= 0 && timedIds.indexOf(item.id) === lineAt

            const row =
              item.id === editingId ? (
                <li key={item.id} className="week-edit">
                  <TaskForm
                    categoryId={item.categoryId}
                    categoryName={getCategory(item.categoryId).name}
                    areas={areas}
                    tasks={allTasks}
                    task={item}
                    onSubmit={(details) => {
                      onUpdateTask(item.id, details)
                      onStopEditing()
                    }}
                    onCancel={onStopEditing}
                  />
                </li>
              ) : (
                <WeekItem
                  key={item.id}
                  item={item}
                  area={findArea(areas, item.areaId)}
                  conflicts={conflicts[item.id] ?? []}
                  today={today}
                  timer={timer}
                  onToggle={onToggleTask}
                  onEdit={onEdit}
                  onDragStart={onDragStart}
                />
              )

            return showLine ? [<li key="now" className="now-line" aria-label="Now" />, row] : row
          })}
          {/* Everything has started: the line goes after the last timed item. */}
          {isToday && lineAt > 0 && lineAt === timedIds.length && (
            <li key="now-end" className="now-line" aria-label="Now" />
          )}
        </ul>
      )}
    </Card>
  )
}

function Priorities({ tasks, today }) {
  return (
    <Card className="side-card gap-2 py-3" role="region" aria-label="Priorities this week">
      <CardHeader>
        <CardTitle>Priorities this week</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="empty">None yet. Tick “Priority” on a task to list it here.</p>
        ) : (
          <ol className="priority-list">
            {tasks.map((task) => {
              const day = dayOf(task)
              return (
                <li key={task.id} className="priority">
                  <StarIcon className="title-icon" aria-hidden="true" />
                  <span className="priority-text">
                    <span>{task.title}</span>
                    <span className="task-when">
                      {day ? formatShortDay(day) : `due ${formatShortDay(task.due)}`}
                      {task.fixed && ' · fixed'}
                    </span>
                  </span>
                  <TaskPills task={task} today={today} />
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function WeekView({
  weekDay,
  today,
  tasks,
  busy,
  areas,
  settings,
  away,
  conflicts,
  toPlace,
  timer,
  onShiftWeek,
  onThisWeek,
  onOpenDay,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onPlace,
  onHalve,
  onDrop,
  onDropOnDay,
  onUnplace,
}) {
  const [editingId, setEditingId] = useState(null)

  const days = weekDays(weekDay)
  const context = { tasks: tasks, busy: busy, settings: settings, away: away }
  const summary = weekSummary(days, context)

  // Everything on this week's days, tasks and busy events together.
  const inWeek = [...tasks, ...busy].filter((item) => days.includes(dayOf(item)))
  const clashes = clashCount(conflicts, inWeek.map((item) => item.id))
  const priorities = weekPriorities(tasks, days, today)

  // Dragging carries the task's id; whoever receives the drop looks it up.
  function handleDragStart(event, task) {
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <section className="week-view" aria-label="Week">
      <div className="view-head">
        <div className="view-title">
          <h2 className="headline">{weekHeadline(summary)}</h2>
          <p className="subline">{weekSubline(summary, clashes)}</p>
        </div>

        <div className="view-nav">
          <Button variant="outline" size="icon" onClick={() => onShiftWeek(-1)} aria-label="Previous week">
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onShiftWeek(1)} aria-label="Next week">
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" onClick={onThisWeek} aria-label="Go to this week">
            This week
          </Button>
        </div>
      </div>

      <div className="week-layout">
        {/* Wide content scrolls inside its own box, never the whole page. */}
        <div className="week-scroll">
          <div className="week-grid">
            {days.map((day, index) => (
              <DayCard
                key={day}
                day={day}
                today={today}
                summary={summary.days[index] ?? daySummary(day, context)}
                items={inWeek.filter((item) => dayOf(item) === day).sort(byClock)}
                areas={areas}
                allTasks={[...tasks, ...busy]}
                conflicts={conflicts}
                timer={timer}
                editingId={editingId}
                onEdit={setEditingId}
                onStopEditing={() => setEditingId(null)}
                onOpenDay={onOpenDay}
                onUpdateTask={onUpdateTask}
                onToggleTask={onToggleTask}
                onDragStart={handleDragStart}
                onDropOnDay={onDropOnDay}
              />
            ))}
          </div>
        </div>

        <aside className="week-side">
          <Priorities tasks={priorities} today={today} />

          <ToPlaceSection
            tasks={toPlace}
            areas={areas}
            allTasks={[...tasks, ...busy]}
            today={today}
            timer={timer}
            onUpdateTask={onUpdateTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onPlace={onPlace}
            onHalve={onHalve}
            onDrop={onDrop}
            onDragStart={handleDragStart}
            onDropHere={onUnplace}
          />
        </aside>
      </div>
    </section>
  )
}

export default WeekView
