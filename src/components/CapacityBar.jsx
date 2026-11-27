/*
  CapacityBar.jsx — one day's hours as a bar: fixed, planned, free.

  The whole bar is the day's free hours from settings (say 8h). Fixed
  time is hatched, planned work is solid, and what's left is empty. If
  the day holds more than it has room for, the bar fills completely and
  turns amber, and the words say by how much.

  It draws only. The numbers come from capacity.js (daySummary).
*/

import { formatHours } from '../lib/dates.js'

function CapacityBar({ summary }) {
  if (summary.away) {
    return <p className="capacity-legend">Away · {summary.away.title}</p>
  }

  const over = summary.free < -0.01
  // The bar's full width is whichever is bigger: the room you have, or
  // what's on the day. Overpacked days fill it entirely.
  const total = Math.max(summary.base, summary.fixed + summary.planned, 0.01)
  const percent = (hours) => `${Math.min(100, (hours / total) * 100)}%`

  return (
    <div className="capacity">
      {/* Decoration: the words underneath say the same thing. */}
      <div className={over ? 'capacity-bar over' : 'capacity-bar'} aria-hidden="true">
        <span className="capacity-fixed" style={{ width: percent(summary.fixed) }} />
        <span className="capacity-planned" style={{ width: percent(summary.planned) }} />
      </div>
      <p className="capacity-legend">
        {formatHours(summary.fixed)} fixed · {formatHours(summary.planned)} planned ·{' '}
        {over ? (
          <span className="clash-note">over by {formatHours(-summary.free)}</span>
        ) : (
          `${formatHours(summary.free)} free`
        )}
      </p>
    </div>
  )
}

export default CapacityBar
