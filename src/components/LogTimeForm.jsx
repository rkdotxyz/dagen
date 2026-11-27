/*
  LogTimeForm.jsx — logging time by hand, or fixing an entry.

  For the hour you forgot to start the timer, or a timer you forgot to
  stop: what it was (a few words, an Area, or both), the day, and from
  when to when. Pass it an entry to edit; pass none to add.

  The check (end after start, something to call it) is timer.js's
  entryProblem, and the message appears under the fields.
*/

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { liveAreas } from '../lib/areas.js'
import { addDays, makeStart, toMinutes, toTime } from '../lib/dates.js'
import { entryProblem } from '../lib/timer.js'

// The last hour, to the quarter hour: a sensible guess for "I forgot".
function lastHour(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const end = Math.floor(minutes / 15) * 15
  return { start: toTime(Math.max(0, end - 60)), end: toTime(end) }
}

function LogTimeForm({ entry, areas, defaultDay, onSave, onCancel }) {
  const guess = lastHour()
  const [label, setLabel] = useState(() => entry?.label ?? '')
  const [areaId, setAreaId] = useState(() => entry?.areaId ?? '')
  const [day, setDay] = useState(() => entry?.start.slice(0, 10) ?? defaultDay)
  const [startTime, setStartTime] = useState(() => entry?.start.slice(11, 16) ?? guess.start)
  const [endTime, setEndTime] = useState(() => entry?.end.slice(11, 16) ?? guess.end)
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()

    // An end earlier than the start means it ran past midnight.
    const start = day && startTime ? makeStart(day, startTime) : ''
    let end = day && endTime ? makeStart(day, endTime) : ''
    if (start && end && toMinutes(endTime) < toMinutes(startTime)) {
      end = makeStart(addDays(day, 1), endTime)
    }

    const problem = entryProblem({ label: label, areaId: areaId || null, start: start, end: end })
    if (problem) {
      setError(problem)
      return
    }

    onSave({ label: label.trim(), areaId: areaId || null, start: start, end: end })
  }

  const offered = liveAreas(areas)

  return (
    <Card className="panel-card log-form" role="region" aria-label={entry ? 'Edit time' : 'Log time'}>
      <CardHeader>
        <CardTitle>{entry ? 'Edit time' : 'Log time'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* noValidate: our messages, not the browser's pop-ups. */}
        <form className="task-form" onSubmit={handleSubmit} noValidate>
          <Input
            className="field"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="What did you work on?"
            aria-label="What you worked on"
            autoFocus
          />

          {offered.length > 0 && (
            <NativeSelect
              className="field"
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              aria-label="Area for this time"
            >
              <option value="">No Area</option>
              {offered.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </NativeSelect>
          )}

          <div className="form-row">
            <Input
              className="field"
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              aria-label="Day of this time"
            />
            <Input
              className="field"
              type="time"
              step="60"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              aria-label="From"
            />
            <Input
              className="field"
              type="time"
              step="60"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              aria-label="To"
            />
          </div>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-row form-end">
            <div className="form-actions">
              <Button type="submit">Save</Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default LogTimeForm
