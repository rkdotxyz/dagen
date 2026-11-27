/*
  InsightsView.jsx — where the time actually went.

  A Week / Month / Quarter switch, then the finding as the headline
  ("November went to Classes and Projects; Personal got 7%"), then:

    tiles      most behind plan · untouched longest · estimates vs
               reality · paused but still used
    split      tracked time by category: one bar, and a legend with hours
               and percentages (the legend is the table: every slice is
               named in words, never by colour alone)
    by Area    planned budget as an outline, tracked time as a fill
    switching  how many Areas got time on each of the last 14 days
    top 5      the labels that took the most hours

  Every number comes from insights.js. With no data a tile shows "—" and
  a hint, never NaN.

  The category colours are Google Calendar's (config.js) and can't be
  tuned for charts: some are light or greyish. So every coloured mark has
  its name and numbers written beside it, slices are separated by a gap
  and outlined, and hovering shows the exact numbers.
*/

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatHours, formatShortDay, weekdayLetter } from '../lib/dates.js'
import {
  BUSY_SWITCHING,
  areasPerDay,
  balanceScore,
  budgetVsActual,
  categoryShares,
  entriesIn,
  estimateAccuracy,
  insightsHeadline,
  longestUntouched,
  mostBehind,
  pausedButUsed,
  periodRange,
  plannedByCategory,
  topLabels,
  trackedByCategory,
} from '../lib/insights.js'

const PERIODS = [
  { id: 'week', name: 'Week' },
  { id: 'month', name: 'Month' },
  { id: 'quarter', name: 'Quarter' },
]

const percent = (share) => `${Math.round(share * 100)}%`

// One stat tile: a label, a big value, and a line under it (or a hint
// when there's nothing to show yet).
function Tile({ label, value, detail, hint }) {
  const empty = value === null
  return (
    <Card className="stat-tile gap-1 px-4 py-3" role="group" aria-label={label}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{empty ? '—' : value}</span>
      <span className="stat-detail">{empty ? hint : detail}</span>
    </Card>
  )
}

function Tiles({ behind, untouched, accuracy, paused, hasAreas }) {
  let accuracyDetail = null
  if (accuracy !== null) {
    const off = Math.round(Math.abs(accuracy - 1) * 100)
    accuracyDetail =
      off < 5
        ? 'Your estimates are about right'
        : `Things take ${off}% ${accuracy > 1 ? 'longer' : 'less time'} than estimated`
  }

  return (
    <div className="stat-tiles">
      <Tile
        label="Most behind plan"
        value={behind ? behind.area.name : null}
        detail={
          behind &&
          `${percent(behind.ratio)} of plan · ${formatHours(behind.actual)} / ${formatHours(behind.budget)}`
        }
        hint={hasAreas ? 'Give active Areas a monthly budget' : 'Add Areas to see this'}
      />
      <Tile
        label="Untouched longest"
        value={untouched ? untouched.area.name : null}
        detail={
          untouched &&
          (untouched.last === null
            ? 'Never tracked'
            : `Last tracked ${untouched.days === 0 ? 'today' : `${untouched.days}d ago`}`)
        }
        hint="Add Areas to see this"
      />
      <Tile
        label="Estimates vs reality"
        value={accuracy !== null ? `${(Math.round(accuracy * 10) / 10).toFixed(1)}×` : null}
        detail={accuracyDetail}
        hint="Tick off tasks you tracked time on"
      />
      <Tile
        label="Paused but still used"
        value={paused.length > 0 ? paused.map((area) => area.name).join(', ') : 'None'}
        detail={paused.length > 0 ? 'Pause it properly, or make it active' : 'Paused means paused'}
      />
    </div>
  )
}

// One bar split by category, and a legend that doubles as the table.
function Split({ shares, balance }) {
  return (
    <Card className="gap-3 py-3" role="region" aria-label="Split by category">
      <CardHeader>
        <CardTitle>Split by category</CardTitle>
        {balance !== null && (
          <span className="heading-note">Balance with plan: {balance}/100</span>
        )}
      </CardHeader>
      <CardContent>
        {shares.length === 0 ? (
          <p className="empty">— Nothing tracked in this period. Start a timer or log time.</p>
        ) : (
          <>
            <div className="split-bar" aria-hidden="true">
              {shares.map((item) => (
                <span
                  key={item.category.id}
                  className="split-segment"
                  style={{ flexGrow: item.share, backgroundColor: item.category.hex }}
                  title={`${item.category.name}: ${formatHours(item.hours)} · ${percent(item.share)}`}
                />
              ))}
            </div>
            <ul className="legend">
              {shares.map((item) => (
                <li key={item.category.id}>
                  <span className="dot" style={{ backgroundColor: item.category.hex }} />
                  <span className="legend-name">{item.category.name}</span>
                  <span className="legend-value">
                    {formatHours(item.hours)} · {percent(item.share)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Planned (the budget, as an outline) against tracked (a fill), per Area.
function ByArea({ rows }) {
  const shown = rows.filter((row) => row.budget > 0 || row.actual > 0)
  const scale = Math.max(1, ...shown.map((row) => Math.max(row.budget, row.actual)))

  return (
    <Card className="gap-3 py-3" role="region" aria-label="Planned vs actual by Area">
      <CardHeader>
        <CardTitle>Planned vs actual by Area</CardTitle>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="empty">— Give Areas a monthly budget, or track time on them.</p>
        ) : (
          <ul className="area-bars">
            {shown.map((row) => {
              const low = row.budget > 0 && row.actual / row.budget < 0.5
              const text = `${formatHours(row.actual)} / ${formatHours(row.budget)}`
              return (
                <li key={row.area.id} className="area-bar-row">
                  <span className="area-bar-name">{row.area.name}</span>
                  <span className="area-bar-track" title={`${row.area.name}: ${text}`} aria-hidden="true">
                    <span className="area-bar-plan" style={{ width: `${(row.budget / scale) * 100}%` }} />
                    <span className="area-bar-fill" style={{ width: `${(row.actual / scale) * 100}%` }} />
                  </span>
                  <span className={low ? 'area-bar-value clash-note' : 'area-bar-value'}>{text}</span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="caption">Outline: the budget for this period. Fill: what you tracked.</p>
      </CardContent>
    </Card>
  )
}

// How many different Areas got time each day, for the last 14 days.
function Switching({ days }) {
  const max = Math.max(BUSY_SWITCHING, ...days.map((item) => item.count))
  const busyDays = days.filter((item) => item.count >= BUSY_SWITCHING).length

  return (
    <Card className="gap-3 py-3" role="region" aria-label="Areas touched per day">
      <CardHeader>
        <CardTitle>Areas touched per day</CardTitle>
        <span className="heading-note">
          {busyDays === 0
            ? 'Last 14 days'
            : `${busyDays} ${busyDays === 1 ? 'day' : 'days'} with ${BUSY_SWITCHING}+`}
        </span>
      </CardHeader>
      <CardContent>
        <ol className="switch-bars">
          {days.map((item) => (
            <li
              key={item.day}
              className={item.count >= BUSY_SWITCHING ? 'switch-day busy' : 'switch-day'}
              title={`${formatShortDay(item.day)}: ${item.count} ${item.count === 1 ? 'Area' : 'Areas'}`}
              aria-label={`${formatShortDay(item.day)}: ${item.count} ${item.count === 1 ? 'Area' : 'Areas'}`}
            >
              <span className="switch-count" aria-hidden="true">
                {item.count > 0 ? item.count : ''}
              </span>
              <span className="switch-bar" style={{ height: `${(item.count / max) * 100}%` }} />
              <span className="switch-letter" aria-hidden="true">
                {weekdayLetter(item.day)}
              </span>
            </li>
          ))}
        </ol>
        <p className="caption">{BUSY_SWITCHING} or more Areas in a day is a lot of switching.</p>
      </CardContent>
    </Card>
  )
}

function TopLabels({ items }) {
  return (
    <Card className="gap-3 py-3" role="region" aria-label="Where the hours went">
      <CardHeader>
        <CardTitle>Where the hours went</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="empty">— Nothing tracked in this period yet.</p>
        ) : (
          <ol className="top-labels">
            {items.map((item) => (
              <li key={item.label}>
                <span className="legend-name">{item.label}</span>
                <span className="legend-value">{formatHours(item.hours)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function InsightsView({ period, today, tasks, areas, entries, activeTimer, onChangePeriod }) {
  const range = periodRange(period, today)
  const now = new Date()
  const inRange = entriesIn(range, entries, activeTimer, now)

  const tracked = trackedByCategory(inRange)
  const planned = plannedByCategory(range, tasks, today)
  const rows = budgetVsActual(areas, inRange, range)

  // For "untouched longest", every entry counts, plus what's running now.
  const allEntries = entriesIn({ from: '0000-01-01', to: '9999-12-31' }, entries, activeTimer, now)

  return (
    <section className="insights-view" aria-label="Insights">
      <div className="view-head">
        <div className="view-title">
          <h2 className="headline">{insightsHeadline(range, tracked, planned)}</h2>
          <p className="subline">
            {formatShortDay(range.from)} – {formatShortDay(range.to)} · {formatHours(
              Object.values(tracked).reduce((total, hours) => total + hours, 0),
            )}{' '}
            tracked
          </p>
        </div>

        <div className="view-nav" role="group" aria-label="Period">
          {PERIODS.map((item) => (
            <Button
              key={item.id}
              variant={item.id === period ? 'default' : 'outline'}
              aria-pressed={item.id === period}
              onClick={() => onChangePeriod(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      </div>

      <Tiles
        behind={mostBehind(rows)}
        untouched={longestUntouched(areas, allEntries, today)}
        accuracy={estimateAccuracy(tasks, entries, range)}
        paused={pausedButUsed(areas, inRange)}
        hasAreas={areas.some((area) => !area.archived)}
      />

      <div className="insights-grid">
        <Split shares={categoryShares(tracked)} balance={balanceScore(planned, tracked)} />
        <ByArea rows={rows} />
        <Switching days={areasPerDay(allEntries, today, 14)} />
        <TopLabels items={topLabels(inRange, 5)} />
      </div>
    </section>
  )
}

export default InsightsView
