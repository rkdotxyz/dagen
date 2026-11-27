/*
  config.js — the settings of Dagen, in one place.

  Everything you might want to tweak lives here rather than being
  scattered through the screens: the categories, their names, and their
  colours. Change a colour here and it changes everywhere it's used.

  Each category carries TWO colour values:
    - hex: the colour the app paints with
    - googleColorId: the number Google Calendar uses for the same colour
      (Google only allows these 11, chosen by number, not by hex)
  Keeping both means an event created in Phase 8 looks the same in
  Google Calendar as it does here.

  Google's 11 colours, by id:
    1 Lavender   2 Sage      3 Grape     4 Flamingo   5 Banana   6 Tangerine
    7 Peacock    8 Graphite  9 Blueberry 10 Basil    11 Tomato
*/

export const CATEGORIES = [
  { id: 'appointments', name: 'Appointments', googleColorId: '11', hex: '#d50000' },
  { id: 'classes', name: 'Classes', googleColorId: '8', hex: '#616161' },
  { id: 'chores', name: 'Chores', googleColorId: '2', hex: '#33b679' },
  { id: 'meals', name: 'Meals', googleColorId: '5', hex: '#f6bf26' },
  { id: 'projects', name: 'Projects', googleColorId: '9', hex: '#3f51b5' },
  { id: 'learning', name: 'Learning', googleColorId: '7', hex: '#039be5' },
  { id: 'social', name: 'Social', googleColorId: '4', hex: '#e67c73' },
  { id: 'personal', name: 'Personal', googleColorId: '3', hex: '#8e24aa' },
]

// Where a task goes when we don't know its category: tasks you made in
// Phase 1, before categories existed.
export const DEFAULT_CATEGORY_ID = 'personal'

// Looks up one category by its id. If the id is unknown (say you rename
// a category later), fall back to the default rather than crashing.
export function getCategory(id) {
  const found = CATEGORIES.find((category) => category.id === id)
  // ?? means "if the left side is null or undefined, use the right side".
  return found ?? CATEGORIES.find((category) => category.id === DEFAULT_CATEGORY_ID)
}

// ---- Planning (Phase 12) ----
//
// How a deadline turns into a "start by" day: Dagen assumes about this
// many hours a day go on one task, plus this many days of buffer. A 5h
// task due Friday: ceil(5 / 2) = 3 days of work + 1 spare = start Monday.
export const HOURS_PER_DAY_ON_TASK = 2
export const START_BUFFER_DAYS = 1

// How many times a task can be pushed back before Dagen suggests
// halving or dropping it.
export const PUSHED_LIMIT = 3

// The most priorities shown for a week. More than five isn't a priority.
export const MAX_PRIORITIES = 5

// The screens, in tab-bar order. "ready" turns a tab on as its phase
// arrives; until then it's shown, switched off, as "coming soon".
export const TABS = [
  { id: 'day', name: 'Day', ready: true },
  { id: 'week', name: 'Week', ready: true },
  { id: 'month', name: 'Month', ready: true },
  { id: 'quarter', name: 'Quarter', ready: false },
  { id: 'insights', name: 'Insights', ready: false },
]
