/*
  CalendarPicker.jsx — which calendars count as busy.

  Your lectures live in a calendar of their own, your birthdays in
  another. Only you know which ones are real claims on your time, so the
  choice is yours rather than guessed.
*/

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

function CalendarPicker({ calendars, chosen, onToggle }) {
  if (calendars.length === 0) {
    return (
      <section className="templates" aria-label="Busy calendars">
        <Card className="panel-card">
          <CardHeader>
            <CardTitle>Busy calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="empty">Connect the calendar to choose.</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="templates" aria-label="Busy calendars">
      <Card className="panel-card">
        <CardHeader>
          <CardTitle>Busy calendars</CardTitle>
        </CardHeader>
        <CardContent>
        <p className="empty">
          Tasks that overlap anything in these calendars are flagged.
        </p>

        <ul className="template-list">
          {calendars.map((calendar) => (
            <li key={calendar.id} className="template">
              <label className="tentative-toggle">
                {/* Radix's checkbox reports through onCheckedChange. */}
                <Checkbox
                  checked={chosen.includes(calendar.id)}
                  onCheckedChange={() => onToggle(calendar.id)}
                />
                {calendar.name}
                {calendar.primary && ' (main)'}
              </label>
            </li>
          ))}
        </ul>
        </CardContent>
      </Card>
    </section>
  )
}

export default CalendarPicker
