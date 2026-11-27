/*
  WeekStrip.jsx — the row of seven days at the top.

  It holds no state about the week: it draws what it's told and reports
  taps upwards. The selected day is filled in and today is underlined
  (both in index.css). The arrows are shadcn/ui Buttons with icons.
*/

import { useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        {/* Icon-only buttons: the aria-label is the name a screen reader
            (and the tests) use. */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onShiftWeek(-1)}
          aria-label="Previous week"
        >
          <ChevronLeftIcon />
        </Button>

        <span className="month-label">{monthLabel}</span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onShiftWeek(1)}
          aria-label="Next week"
        >
          <ChevronRightIcon />
        </Button>

        <Button variant="outline" onClick={onToday} aria-label="Go to today">
          Today
        </Button>
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
              <span className="day-number">{dayNumber(day)}</span>
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
