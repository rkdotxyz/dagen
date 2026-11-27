/*
  TaskItem.jsx — one task row: when it happens, what it is, and whether
  anything is wrong with that plan.

  Since Phase 11 the "when" line has three forms, one per placement:
    "Today · 14:00–15:30"   timed
    "Today · Any time · 1h" on a day, no hour
    "Not placed · 1h"       waiting in To place
  and a task's Area follows it, greyed out if that Area was archived.

  It still changes nothing itself. It reports taps upwards and draws what
  it's given. Since Phase 10 the row is a sketched card, and the controls
  inside it are drawably's: real inputs and buttons underneath, with a pen
  drawing layered behind them.
*/

import {
  DrawablyBadge,
  DrawablyButton,
  DrawablyCard,
  DrawablyCheckbox,
} from 'drawably/react'
import { formatDay, formatDuration, formatRange } from '../lib/dates.js'
import { dayOf, placementOf } from '../lib/placement.js'

// The "when" line, in words.
function describeWhen(task) {
  const placement = placementOf(task)
  if (placement === 'timed') {
    return `${formatDay(dayOf(task))} · ${formatRange(task.start, task.durationMin)}`
  }
  if (placement === 'anytime') {
    return `${formatDay(dayOf(task))} · Any time · ${formatDuration(task.durationMin)}`
  }
  return `Not placed · ${formatDuration(task.durationMin)}`
}

function TaskItem({ task, area = null, conflicts, onToggle, onEdit, onDelete }) {
  const isDone = task.status === 'done'

  // The row's state as class names. The CSS uses "clash" and "done" to
  // change the pen colour of everything drawn inside the row.
  const classNames = [
    'task',
    isDone && 'done',
    task.tentative && 'tentative',
    conflicts.length > 0 && 'clash',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={classNames}>
      <DrawablyCard className="task-card">
        <label className="task-main">
          <DrawablyCheckbox checked={isDone} onChange={() => onToggle(task.id)} />

          <span className="task-text">
            <span className="task-title">
              {/* The tilde marks a time that may still move, now in a
                  little sketched tag. Google gets the same mark. */}
              {/* The gap after the tag comes from CSS (.tilde), not a
                  space character: a space here would end up in the title's
                  text for every task, tentative or not. */}
              {task.tentative && <DrawablyBadge className="tilde">~</DrawablyBadge>}
              {task.title}
            </span>

            <span className="task-when">
              {describeWhen(task)}
              {area && (
                <span className={area.archived ? 'task-area archived' : 'task-area'}>
                  {' · '}
                  {area.name}
                </span>
              )}
            </span>

            {conflicts.length > 0 && (
              <span className="clash-note">
                ⚠ Overlaps{' '}
                {conflicts
                  .map(
                    (other) =>
                      `${other.title} ${formatRange(other.start, other.durationMin)}`,
                  )
                  .join(', ')}
              </span>
            )}
          </span>
        </label>

        {/* Words instead of symbols: the pen font draws letters, and has
            no pencil or multiplication sign. The aria-labels are what
            screen readers (and the tests) use, and they haven't changed. */}
        <DrawablyButton
          className="row-button"
          onClick={() => onEdit(task.id)}
          aria-label={`Edit ${task.title}`}
        >
          edit
        </DrawablyButton>

        <DrawablyButton
          className="row-button"
          tone="danger"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete ${task.title}`}
        >
          x
        </DrawablyButton>
      </DrawablyCard>
    </li>
  )
}

export default TaskItem
