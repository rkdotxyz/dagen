/*
  WeekStrip.jsx — the row of seven days at the top.

  It holds no state about the week: it draws what it's told and reports
  taps upwards. Since Phase 10 the selected day gets a pen loop around its
  number and today gets an underline, instead of a coloured block.
*/

import { useRef } from 'react'
import { DrawablyButton, DrawablyCircle, DrawablyUnderline } from 'drawably/react'
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
  const touchStartX = useRef(0)

  function handleTouchStart(event) {
    touchStartX.current = event.changedTouches[0].clientX
  }

  function handleTouchEnd(event) {
    const distance = event.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(distance) < 50) return
    onShiftWeek(distance < 0 ? 1 : -1)
  }

  return (
    <nav
      className="week-strip"
      aria-label="Week"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="week-head">
        {/* "prev" and "next" in words: the pen font has no arrow glyphs. */}
        <DrawablyButton onClick={() => onShiftWeek(-1)} aria-label="Previous week">
          prev
        </DrawablyButton>

        <span className="month-label">{monthLabel}</span>

        <DrawablyButton onClick={() => onShiftWeek(1)} aria-label="Next week">
          next
        </DrawablyButton>

        <DrawablyButton
          className="today-button"
          onClick={onToday}
          aria-label="Go to today"
        >
          Today
        </DrawablyButton>
      </div>

      <div className="week-days">
        {days.map((day) => {
          const marker = markers[day] ?? {}
          const isSelected = day === selectedDay
          const isToday = day === today

          const label = [
            formatDay(day, new Date(`${today}T12:00`)),
            marker.count ? `${marker.count} tasks` : null,
            marker.hasConflict ? 'has a clash' : null,
          ]
            .filter(Boolean)
            .join(', ')

          // The number, decorated: a loop for the selected day, a line
          // under today, plain otherwise. A decoration is mounted fresh
          // each time, so moving between days draws a new loop each time.
          let number = dayNumber(day)
          if (isSelected) number = <DrawablyCircle>{number}</DrawablyCircle>
          else if (isToday) number = <DrawablyUnderline>{number}</DrawablyUnderline>

          return (
            <button
              key={day}
              type="button"
              className={isSelected ? 'day selected' : 'day'}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() => onSelect(day)}
            >
              <span className="day-letter">{weekdayLetter(day)}</span>
              <span className="day-number">{number}</span>
              <span className="day-marks" aria-hidden="true">
                {marker.hasConflict ? '!' : marker.count ? '.' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default WeekStrip
