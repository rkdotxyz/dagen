/*
  TaskItem.jsx — one task row: when it happens, what it is, and whether
  anything is wrong with that plan.

  It still changes nothing itself. It reports taps upwards and draws what
  it's given, including the list of tasks it clashes with.
*/

import { formatDay, formatRange, splitStart } from '../lib/dates.js'

function TaskItem({ task, conflicts, onToggle, onDelete }) {
  const isDone = task.status === 'done'
  const { day } = splitStart(task.start)

  // Build the row's class names from its state. filter(Boolean) drops the
  // false ones, so "task done clash" or just "task" comes out.
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
      <label className="task-main">
        <input type="checkbox" checked={isDone} onChange={() => onToggle(task.id)} />

        <span className="task-text">
          <span className="task-title">
            {/* The tilde marks a time that may still move. Phase 8 puts
                the same mark in front of the Google Calendar event. */}
            {task.tentative && <span className="tilde">~ </span>}
            {task.title}
          </span>

          <span className="task-when">
            {formatDay(day)} · {formatRange(task.start, task.durationMin)}
          </span>

          {conflicts.length > 0 && (
            <span className="clash-note">
              ⚠ Overlaps{' '}
              {conflicts
                .map((other) => `${other.title} ${formatRange(other.start, other.durationMin)}`)
                .join(', ')}
            </span>
          )}
        </span>
      </label>

      <button
        type="button"
        className="delete"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete ${task.title}`}
      >
        ×
      </button>
    </li>
  )
}

export default TaskItem
