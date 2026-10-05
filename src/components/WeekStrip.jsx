/*
  WeekStrip.jsx — the row of seven days at the top, like the one in the
  Google Calendar app.

  It holds no state of its own: it's told which week to draw and which day
  is selected, and it reports taps upwards. A component like this is easy
  to reason about, because the same props always draw the same thing.
*/

import { useRef } from 'react'
import { dayNumber, formatDay, weekdayLetter } from '../lib/dates.js'

function WeekStrip({
  days,
  selectedDay,
  today,
  markers,
  monthLabel,
  onSelect,
  onShiftWeek,
  onToday,
}) {
  // Swipe: remember where a finger went down, and when it lifts, see how
  // far it travelled sideways. More than 50 pixels counts as a swipe;
  // less is a tap or a wobble.
  //
  // useRef is a box React keeps between redraws. A plain variable would be
  // reset every redraw; state would redraw the screen on every touch, which
  // is pointless here because nothing on screen depends on it yet.
  const touchStartX = useRef(0)

  function handleTouchStart(event) {
    touchStartX.current = event.changedTouches[0].clientX
  }

  function handleTouchEnd(event) {
    const distance = event.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(distance) < 50) return
    // Dragging left (a negative distance) moves forward in time.
    onShiftWeek(distance < 0 ? 1 : -1)
  }

  return (
    // The swipe handlers sit on the whole strip, so a swipe anywhere
    // across it counts, not only on the row of numbers.
    <nav
      className="week-strip"
      aria-label="Week"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="week-head">
        <button type="button" onClick={() => onShiftWeek(-1)} aria-label="Previous week">
          ‹
        </button>

        <span className="month-label">{monthLabel}</span>

        <button type="button" onClick={() => onShiftWeek(1)} aria-label="Next week">
          ›
        </button>

        <button type="button" className="today-button" onClick={onToday}>
          Today
        </button>
      </div>

      <div className="week-days">
        {days.map((day) => {
          // ?? {} so a day with nothing on it still has something to read.
          const marker = markers[day] ?? {}
          const isSelected = day === selectedDay

          // The accessible name: what a screen reader announces, and what
          // the tests search for. It says everything the dots say visually.
          const label = [
            formatDay(day, new Date(`${today}T12:00`)),
            marker.count ? `${marker.count} tasks` : null,
            marker.hasConflict ? 'has a clash' : null,
          ]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={day}
              type="button"
              className={isSelected ? 'day selected' : 'day'}
              // aria-current="date" marks today even when another day is
              // selected; aria-pressed marks the selected one.
              aria-current={day === today ? 'date' : undefined}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() => onSelect(day)}
            >
              <span className="day-letter">{weekdayLetter(day)}</span>
              <span className="day-number">{dayNumber(day)}</span>

              {/* aria-hidden: the dots repeat what the label already says,
                  so screen readers should skip them. */}
              <span className="day-marks" aria-hidden="true">
                {marker.hasConflict ? '!' : marker.count ? '·' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default WeekStrip
