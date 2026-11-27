/*
  MonthView.jsx — a month at a glance, and whether your budgets fit it.

  At the top, the finding: "December has 84h free" or "3 overpacked days
  in December", with planned hours, deadlines and tracked time below.

  Then a calendar, Monday first. Each day shows its date and up to two
  short labels (deadlines, one-off fixed events, priorities). Away days
  are hatched, overpacked days get an amber edge, and tapping a day opens
  it on the Day screen. Weekly repeating things are left out of the
  labels so the cells stay readable; they still count in the hours.

  Beside it (below it on a phone), the monthly hour budgets: one row per
  Area that isn't paused, with − and + to move it an hour at a time, and a
  bar comparing all the budgets with the hours the month really has.

  The sums are in capacity.js and month.js; this only draws them.
*/

import { ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategory } from '../config.js'
import { daySummary, monthSummary } from '../lib/capacity.js'
import { dayNumber, formatHours, formatShortDay, monthDays } from '../lib/dates.js'
import {
  budgetAreas,
  budgetCheck,
  cellLabels,
  deadlinesIn,
  monthGrid,
  monthHeadline,
  monthName,
  monthSubline,
  nudgedBudget,
  trackedHoursIn,
} from '../lib/month.js'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function DayCell({ day, inMonth, isToday, summary, labels, more, onOpen }) {
  const over = summary.free < -0.01

  // What a screen reader hears: the day, then anything worth knowing.
  const spoken = [
    formatShortDay(day),
    summary.away && `away, ${summary.away.title}`,
    over && `over by ${formatHours(-summary.free)}`,
    ...labels.map((label) => label.text),
    more > 0 && `${more} more`,
  ]
    .filter(Boolean)
    .join(', ')

  const classNames = [
    'month-cell',
    !inMonth && 'outside',
    isToday && 'today',
    over && 'over',
    summary.away && 'away',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classNames} onClick={() => onOpen(day)} aria-label={spoken}>
      <span className="month-date">{dayNumber(day)}</span>
      {labels.map((label) => (
        // "cell-fixed", not "fixed": Tailwind's "fixed" class means
        // position: fixed, and would pull the label out of the cell.
        <span key={label.id} className={`cell-label cell-${label.kind}`}>
          {label.text}
        </span>
      ))}
      {more > 0 && <span className="cell-more">+{more} more</span>}
    </button>
  )
}

function Budgets({ areas, summary, onChangeBudget }) {
  const rows = budgetAreas(areas)
  const check = budgetCheck(areas, summary)
  // The bar's full width is whichever is bigger: budgets or room.
  const scale = Math.max(check.total, check.room, 1)

  return (
    <Card className="side-card gap-3 py-3" role="region" aria-label="Monthly budgets">
      <CardHeader>
        <CardTitle>Monthly budgets</CardTitle>
      </CardHeader>
      <CardContent className="budgets">
        {rows.length === 0 ? (
          <p className="empty">
            No budgets yet. Add Areas (the Areas button) and give them hours here.
          </p>
        ) : (
          <>
            <ul className="budget-list">
              {rows.map((area) => (
                <li key={area.id} className="budget-row">
                  <span className="dot" style={{ backgroundColor: getCategory(area.categoryId).hex }} />
                  <span className="budget-name">{area.name}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => onChangeBudget(area.id, nudgedBudget(area, -1))}
                    disabled={(area.monthlyBudgetHours ?? 0) <= 0}
                    aria-label={`Less time for ${area.name}`}
                  >
                    <MinusIcon />
                  </Button>
                  <span className="budget-hours">{area.monthlyBudgetHours ?? 0}h</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => onChangeBudget(area.id, nudgedBudget(area, 1))}
                    aria-label={`More time for ${area.name}`}
                  >
                    <PlusIcon />
                  </Button>
                </li>
              ))}
            </ul>

            {/* Budgets as a bar, with a mark where the month's room ends. */}
            <div className={check.over ? 'budget-bar over' : 'budget-bar'} aria-hidden="true">
              <span className="budget-fill" style={{ width: `${(check.total / scale) * 100}%` }} />
              <span className="budget-room" style={{ left: `${(check.room / scale) * 100}%` }} />
            </div>
            <p className="capacity-legend">
              {check.total}h budgeted of {check.room}h after fixed time
            </p>
            <p className={check.over ? 'budget-message clash-note' : 'budget-message'}>
              {check.message}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MonthView({
  monthDay,
  today,
  tasks,
  busy,
  areas,
  entries,
  settings,
  away,
  onShiftMonth,
  onThisMonth,
  onOpenDay,
  onChangeBudget,
}) {
  const context = { tasks: tasks, busy: busy, settings: settings, away: away }
  const summary = monthSummary(monthDays(monthDay), context)
  const month = monthDay.slice(0, 7)

  return (
    <section className="month-view" aria-label="Month">
      <div className="view-head">
        <div className="view-title">
          <h2 className="headline">{monthHeadline(summary, monthDay)}</h2>
          <p className="subline">
            {monthSubline(summary, deadlinesIn(monthDay, tasks), trackedHoursIn(monthDay, entries))}
          </p>
        </div>

        <div className="view-nav">
          <Button variant="outline" size="icon" onClick={() => onShiftMonth(-1)} aria-label="Previous month">
            <ChevronLeftIcon />
          </Button>
          <span className="month-label">{monthName(monthDay, true)}</span>
          <Button variant="outline" size="icon" onClick={() => onShiftMonth(1)} aria-label="Next month">
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" onClick={onThisMonth} aria-label="Go to this month">
            This month
          </Button>
        </div>
      </div>

      <div className="week-layout">
        <div className="month-main">
          <div className="month-grid" role="group" aria-label={monthName(monthDay, true)}>
            {WEEKDAY_LETTERS.map((letter, index) => (
              <span key={index} className="month-weekday" aria-hidden="true">
                {letter}
              </span>
            ))}
            {monthGrid(monthDay)
              .flat()
              .map((day) => {
                const { labels, more } = cellLabels(day, tasks, busy)
                return (
                  <DayCell
                    key={day}
                    day={day}
                    inMonth={day.slice(0, 7) === month}
                    isToday={day === today}
                    summary={daySummary(day, context)}
                    labels={labels}
                    more={more}
                    onOpen={onOpenDay}
                  />
                )
              })}
          </div>
          <p className="caption">
            Weekly repeating things (chores, lectures) are left out of the days to keep them
            readable. They still count in the hours.
          </p>
        </div>

        <aside className="week-side">
          <Budgets areas={areas} summary={summary} onChangeBudget={onChangeBudget} />
        </aside>
      </div>
    </section>
  )
}

export default MonthView
