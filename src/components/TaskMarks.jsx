/*
  TaskMarks.jsx — the small marks beside a task's title.

    lock         a fixed event: happens at a set time, never rolls over
    star         a priority this week
    pill         its deadline: "start now", "start by Thu 3 Dec", "overdue"
    pill         "pushed 2×" when it has rolled over before

  Fixed and priority are shown as icons AND named for screen readers, so
  neither depends on colour alone. The deadline words come from
  deadlines.js.
*/

import { LockIcon, StarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { deadlineLabel, deadlineState } from '../lib/deadlines.js'

export function TitleIcons({ task }) {
  return (
    <>
      {task.fixed && <LockIcon className="title-icon" aria-label="Fixed" role="img" />}
      {task.priority && <StarIcon className="title-icon" aria-label="Priority" role="img" />}
    </>
  )
}

export function TaskPills({ task, today }) {
  const label = deadlineLabel(task, today)
  const state = deadlineState(task, today)
  const pushed = task.rolled ?? 0

  if (!label && pushed === 0) return null

  return (
    <span className="pills">
      {label && (
        <Badge
          variant="outline"
          className={state === 'upcoming' ? 'pill' : 'pill pill-warn'}
        >
          {label}
        </Badge>
      )}
      {pushed > 0 && (
        <Badge variant="secondary" className="pill">
          pushed {pushed}×
        </Badge>
      )}
    </span>
  )
}
