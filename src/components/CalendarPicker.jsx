/*
  CalendarPicker.jsx — which calendars count as busy.

  Your lectures live in a calendar of their own, your birthdays in
  another. Only you know which ones are real claims on your time, so the
  choice is yours rather than guessed.
*/

import { DrawablyCard, DrawablyCheckbox } from 'drawably/react'

function CalendarPicker({ calendars, chosen, onToggle }) {
  if (calendars.length === 0) {
    return (
      <section className="templates" aria-label="Busy calendars">
        <DrawablyCard className="panel-card">
          <h2>Busy calendars</h2>
          <p className="empty">Connect the calendar to choose.</p>
        </DrawablyCard>
      </section>
    )
  }

  return (
    <section className="templates" aria-label="Busy calendars">
      <DrawablyCard className="panel-card">
        <h2>Busy calendars</h2>
        <p className="empty">
          Tasks that overlap anything in these calendars are flagged.
        </p>

        <ul className="template-list">
          {calendars.map((calendar) => (
            <li key={calendar.id} className="template">
              <label className="tentative-toggle">
                <DrawablyCheckbox
                  checked={chosen.includes(calendar.id)}
                  onChange={() => onToggle(calendar.id)}
                />
                {calendar.name}
                {calendar.primary && ' (main)'}
              </label>
            </li>
          ))}
        </ul>
      </DrawablyCard>
    </section>
  )
}

export default CalendarPicker
