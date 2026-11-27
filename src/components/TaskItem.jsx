/*
  TaskItem.jsx — one task row: when it happens, what it is, and whether
  anything is wrong with that plan.

  Since Phase 11 the "when" line has three forms, one per placement:
    "Today · 14:00–15:30"   timed
    "Today · Any time · 1h" on a day, no hour
    "Not placed · 1h"       waiting in To place
  and a task's Area follows it, greyed out if that Area was archived.

  It still changes nothing itself. It reports taps upwards and draws what
  it's given. The row is a shadcn/ui Card with a Checkbox and two icon
  Buttons.
*/

import { PencilIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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

  // The row's state as class names. The CSS uses "clash" for an amber
  // edge and "done" to fade the row and strike through its title.
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
      {/* The utility classes reshape shadcn's Card from a column into a
          single row; cn() inside Card lets these win over its defaults. */}
      <Card className="task-card flex-row items-center gap-2 px-3 py-2.5">
        <label className="task-main">
          <Checkbox checked={isDone} onCheckedChange={() => onToggle(task.id)} />

          <span className="task-text">
            <span className="task-title">
              {/* The tilde marks a time that may still move. Google gets
                  the same mark. The gap after it comes from CSS (.tilde),
                  not a space: a space would end up in every title's text. */}
              {task.tentative && (
                <Badge variant="outline" className="tilde">
                  ~
                </Badge>
              )}
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

        {/* Icon-only buttons. The aria-labels are what screen readers (and
            the tests) use, so they say exactly what each one does. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(task.id)}
          aria-label={`Edit ${task.title}`}
        >
          <PencilIcon />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete ${task.title}`}
        >
          <XIcon />
        </Button>
      </Card>
    </li>
  )
}

export default TaskItem
