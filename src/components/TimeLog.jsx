/*
  TimeLog.jsx — the time you tracked on the day you're looking at.

  One row per entry: what, when, how long, and how it was logged (timer,
  by hand, or as planned). Each can be edited or deleted, and "+ Log
  time" adds one by hand. App opens the form; this only lists and reports.
*/

import { PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCategory } from '../config.js'
import { findArea } from '../lib/areas.js'
import { formatDuration } from '../lib/dates.js'
import { entryMinutes } from '../lib/timer.js'

const SOURCE_NAMES = { timer: 'timer', manual: 'by hand', 'as-planned': 'as planned' }

function TimeLog({ entries, areas, onAdd, onEdit, onDelete }) {
  const total = entries.reduce((sum, entry) => sum + entryMinutes(entry), 0)

  return (
    <section className="category time-log" aria-label="Time log">
      <div className="category-header">
        <h2 className="section-title">
          Time log
          <Badge variant="secondary">{total > 0 ? formatDuration(total) : '0m'}</Badge>
        </h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <PlusIcon />
          Log time
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="empty">Nothing tracked on this day yet.</p>
      ) : (
        <ul className="template-list">
          {entries.map((entry) => {
            const area = findArea(areas, entry.areaId)
            return (
              <li key={entry.id} className="template">
                <span className="dot" style={{ backgroundColor: getCategory(entry.categoryId).hex }} />
                <span className="template-text">
                  <span>{entry.label}</span>
                  <span className="task-when">
                    {entry.start.slice(11, 16)}–{entry.end.slice(11, 16)} ·{' '}
                    {formatDuration(entryMinutes(entry))}
                    {area && ` · ${area.name}`} · {SOURCE_NAMES[entry.source] ?? entry.source}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(entry.id)}
                  aria-label={`Edit time: ${entry.label}`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Delete time: ${entry.label}`}
                >
                  <XIcon />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default TimeLog
