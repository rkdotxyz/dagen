/*
  CalendarBar.jsx — the line about Google Calendar.

  Four states, and it says which one you're in rather than hiding it:
  not signed in at all, signed in but no calendar permission, connected,
  and connected but something went wrong. When connected it also opens the
  list of calendars that count as busy.
*/

// Each link gets a pen underline, re-sketched whenever you hover it.
import { DrawablyUnderline } from 'drawably/react'

function CalendarBar({
  session,
  token,
  failures,
  sending,
  onConnect,
  onChooseCalendars,
}) {
  // No account at all: Phase 7's line already explains that.
  if (!session) return null

  if (!token) {
    return (
      <p className="account">
        Not in Google Calendar yet.{' '}
        <button type="button" className="link" onClick={onConnect}>
          <DrawablyUnderline>Connect calendar</DrawablyUnderline>
        </button>
      </p>
    )
  }

  return (
    <p className="account">
      <span>In Google Calendar</span>
      {sending && <span className="syncing"> · sending…</span>}{' '}
      <button type="button" className="link" onClick={onChooseCalendars}>
        <DrawablyUnderline>Busy calendars</DrawablyUnderline>
      </button>
      {failures > 0 && (
        <span className="clash-note">
          {' '}
          ⚠ {failures} change{failures === 1 ? '' : 's'} could not be sent.{' '}
          <button type="button" className="link" onClick={onConnect}>
            <DrawablyUnderline>Reconnect</DrawablyUnderline>
          </button>
        </span>
      )}
    </p>
  )
}

export default CalendarBar
