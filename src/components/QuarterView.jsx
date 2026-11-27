/*
  QuarterView.jsx — three months, and what you're putting your time into.

  The headline counts active Areas, and says so when there are more than
  your limit ("6 active Areas this quarter, more than 5").

  Three parts:
    Triage     Active · Maintain · Paused. Tap an Area to move it to the
               next column. This is the quarterly decision about where
               your attention goes.
    Timeline   months across with week ticks, one lane per Area that has
               dates or dated things in the range: a bar from its start to
               its end, round markers for deadlines, square ones for
               one-off fixed events, your away blocks hatched across every
               lane, and a line for today. Labels never overlap (see
               placeLabels in quarter.js). On a phone, the timeline scrolls
               sideways inside its own box.
    Outcomes   each active Area's goal for the quarter, and the hours
               tracked on it against three months of its budget.

  ‹ › move three months at a time.
*/

import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getCategory } from '../config.js'
import { AREA_STATUSES, STATUS_NAMES, liveAreas } from '../lib/areas.js'
import { formatHours, formatShortDay } from '../lib/dates.js'
import { monthName } from '../lib/month.js'
import {
  DAY_PX,
  awayBands,
  dayX,
  estimateWidth,
  inRange,
  lanes,
  monthStarts,
  nextStatus,
  outcomeRows,
  placeLabels,
  quarterHeadline,
  quarterRange,
  weekStarts,
} from '../lib/quarter.js'

// Half a marker, in pixels: placeLabels keeps labels this far clear.
const MARKER_RADIUS = 5

function Triage({ areas, onCycle }) {
  const live = liveAreas(areas)

  return (
    <Card className="side-card gap-3 py-3" role="region" aria-label="Triage">
      <CardHeader>
        <CardTitle>Triage</CardTitle>
        <span className="heading-note">Tap an Area to move it along</span>
      </CardHeader>
      <CardContent className="triage">
        {AREA_STATUSES.map((status) => {
          const inColumn = live.filter((area) => area.status === status)
          return (
            <div key={status} className="triage-column" role="group" aria-label={STATUS_NAMES[status]}>
              <h3 className="panel-subhead">
                {STATUS_NAMES[status]} · {inColumn.length}
              </h3>
              {inColumn.length === 0 ? (
                <p className="empty">None</p>
              ) : (
                inColumn.map((area) => (
                  <Button
                    key={area.id}
                    variant="outline"
                    size="sm"
                    className="area-chip justify-start"
                    onClick={() => onCycle(area.id, nextStatus(area.status))}
                    aria-label={`${area.name}, ${STATUS_NAMES[area.status]}. Move to ${STATUS_NAMES[nextStatus(area.status)]}`}
                  >
                    <span className="dot" style={{ backgroundColor: getCategory(area.categoryId).hex }} />
                    <span className="area-chip-name">{area.name}</span>
                  </Button>
                ))
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// One Area's lane on the timeline.
function Lane({ lane, range, width }) {
  const markers = lane.markers.map((marker) => ({
    ...marker,
    // The centre of the day the marker is on.
    x: dayX(marker.day, range) + DAY_PX / 2,
  }))
  const labels = placeLabels(
    markers.map((marker) => ({ id: marker.id, x: marker.x, width: estimateWidth(marker.label) })),
    { radius: MARKER_RADIUS, gap: 4, trackWidth: width },
  )
  const labelFor = (id) => labels.find((label) => label.id === id)

  return (
    <div className="lane" role="listitem">
      <span className="lane-name">
        <span className="dot" style={{ backgroundColor: getCategory(lane.area.categoryId).hex }} />
        {lane.area.name}
      </span>
      <div className="lane-track" style={{ width: width }}>
        {lane.bar && (
          <span
            className="lane-bar"
            style={{
              left: dayX(lane.bar.from, range),
              width: dayX(lane.bar.to, range) - dayX(lane.bar.from, range) + DAY_PX,
              backgroundColor: getCategory(lane.area.categoryId).hex,
            }}
            aria-label={`${lane.area.name}: ${formatShortDay(lane.bar.from)} to ${formatShortDay(lane.bar.to)}`}
            role="img"
          />
        )}

        {markers.map((marker) => {
          const label = labelFor(marker.id)
          const spoken = `${marker.kind === 'deadline' ? 'Deadline' : 'Event'}: ${marker.label}, ${formatShortDay(marker.day)}`
          return (
            <span key={marker.id}>
              <span
                className={`marker marker-${marker.kind}`}
                style={{ left: marker.x - MARKER_RADIUS }}
                role="img"
                aria-label={spoken}
                title={spoken}
              />
              {label.side !== 'hidden' && (
                // Decoration: the marker's own name says the same thing.
                <span
                  className="marker-label"
                  style={{ left: label.left, width: label.width }}
                  aria-hidden="true"
                >
                  {marker.label}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Timeline({ areas, tasks, away, range, today }) {
  const width = range.days * DAY_PX
  const shown = lanes(areas, tasks, range)
  const bands = awayBands(away, range)

  return (
    <Card className="gap-3 py-3" role="region" aria-label="Timeline">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="empty">
            Nothing dated yet. Give an Area start and end days, or give its tasks deadlines.
          </p>
        ) : (
          // Wide content scrolls sideways inside this box, never the page.
          <div className="timeline-scroll">
            <div className="timeline" style={{ '--track-width': `${width}px` }}>
              {/* Month names and week ticks along the top. */}
              <div className="lane timeline-head" aria-hidden="true">
                <span className="lane-name" />
                <div className="lane-track" style={{ width: width }}>
                  {weekStarts(range).map((day) => (
                    <span key={day} className="week-tick" style={{ left: dayX(day, range) }} />
                  ))}
                  {monthStarts(range).map((day) => (
                    <span key={day} className="month-tick" style={{ left: dayX(day, range) }}>
                      {monthName(day)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="timeline-lanes" role="list">
                {shown.map((lane) => (
                  <Lane key={lane.area.id} lane={lane} range={range} width={width} />
                ))}

                {/* Away blocks and today, drawn once across every lane. */}
                <div className="timeline-overlay" style={{ width: width }} aria-hidden="true">
                  {bands.map((band) => (
                    <span
                      key={band.id}
                      className="away-band"
                      style={{ left: band.x, width: band.width }}
                      title={`Away · ${band.title}`}
                    />
                  ))}
                  {inRange(today, range) && (
                    <span className="today-line" style={{ left: dayX(today, range) + DAY_PX / 2 }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {bands.length > 0 && (
          <p className="caption">
            Hatched: away ({bands.map((band) => band.title).join(', ')}).
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function OutcomeRow({ row, onSaveOutcome }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(row.area.outcome ?? '')
  const behind = row.budget > 0 && row.tracked / row.budget < 0.5

  return (
    <li className="outcome">
      <span className="dot" style={{ backgroundColor: getCategory(row.area.categoryId).hex }} />
      <span className="outcome-text">
        <span className="outcome-name">{row.area.name}</span>
        {editing ? (
          <form
            className="outcome-form"
            onSubmit={(event) => {
              event.preventDefault()
              onSaveOutcome(row.area.id, text.trim())
              setEditing(false)
            }}
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What will be true at the end of the quarter?"
              aria-label={`Outcome for ${row.area.name}`}
              autoFocus
            />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        ) : row.area.outcome ? (
          <span>{row.area.outcome}</span>
        ) : (
          <span className="muted-text">No outcome yet. What will be true by the end?</span>
        )}
        <span className={behind ? 'task-when clash-note' : 'task-when'}>
          {formatHours(row.tracked)} / {row.budget}h tracked
        </span>
      </span>
      {!editing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Start from the outcome as it is now.
            setText(row.area.outcome ?? '')
            setEditing(true)
          }}
          aria-label={`Edit the outcome for ${row.area.name}`}
        >
          <PencilIcon />
        </Button>
      )}
    </li>
  )
}

function Outcomes({ areas, entries, range, onSaveOutcome }) {
  const rows = outcomeRows(areas, entries, range)

  return (
    <Card className="side-card gap-3 py-3" role="region" aria-label="Outcomes">
      <CardHeader>
        <CardTitle>Outcomes</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="empty">No active Areas. Move one to Active in Triage.</p>
        ) : (
          <ul className="template-list">
            {rows.map((row) => (
              <OutcomeRow key={row.area.id} row={row} onSaveOutcome={onSaveOutcome} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function QuarterView({
  quarterDay,
  today,
  tasks,
  areas,
  entries,
  away,
  settings,
  onShiftQuarter,
  onThisQuarter,
  onChangeArea,
}) {
  const range = quarterRange(quarterDay)
  const months = monthStarts(range)

  return (
    <section className="quarter-view" aria-label="Quarter">
      <div className="view-head">
        <div className="view-title">
          <h2 className="headline">{quarterHeadline(areas, settings.activeAreaLimit)}</h2>
          <p className="subline">
            {monthName(months[0])} – {monthName(months[2], true)}
          </p>
        </div>
        <div className="view-nav">
          <Button variant="outline" size="icon" onClick={() => onShiftQuarter(-1)} aria-label="Previous three months">
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onShiftQuarter(1)} aria-label="Next three months">
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" onClick={onThisQuarter} aria-label="Go to this quarter">
            From this month
          </Button>
        </div>
      </div>

      <div className="quarter-layout">
        <Triage areas={areas} onCycle={(id, status) => onChangeArea(id, { status: status })} />
        <Timeline areas={areas} tasks={tasks} away={away} range={range} today={today} />
        <Outcomes
          areas={areas}
          entries={entries}
          range={range}
          onSaveOutcome={(id, outcome) => onChangeArea(id, { outcome: outcome })}
        />
      </div>
    </section>
  )
}

export default QuarterView
