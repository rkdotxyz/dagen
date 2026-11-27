/*
  App.test.jsx — tests for the app as a person would use it.

  Sections show only the day the week strip is on, so several tests move
  between days first. The helpers at the top hide that plumbing, so each
  test reads as the sentence it's checking.

  The last group covers recurring chores, which is the trickiest thing in
  the app: a rule that quietly makes tasks must not make them twice, and
  must take no for an answer.
*/

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import App from './App.jsx'
import {
  addDays,
  formatDay,
  formatDuration,
  formatShortDay,
  isoWeek,
  todayISO,
  weekDays,
  weekdayName,
} from './lib/dates.js'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  // The screen is kept in the address (#week). jsdom keeps one address
  // for the whole file, so put it back for the next test.
  window.history.replaceState(null, '', '/')
})

function section(name) {
  return screen.getByRole('region', { name: name })
}

// The week strip's days are named the way a screen reader hears them:
// "Today", "Tomorrow, 2 tasks", "Sat 10 Oct, has a clash". A pattern
// matches the start of the name, so markers don't break the lookup.
function dayButton(namePattern) {
  return within(screen.getByRole('navigation', { name: 'Week' })).getByLabelText(
    namePattern,
  )
}

function headerOf(categoryName) {
  return within(section(categoryName))
    .getAllByRole('button')
    .find((button) => button.hasAttribute('aria-expanded'))
}

// Fills in the add form of one category and submits it, then closes the
// form unless keepOpen is asked for. Closing matters: an open form shows
// its own clash warning, which would otherwise be mistaken for a row's.
function addTo(categoryName, { title, time, durationMin = 30, day, keepOpen }) {
  fireEvent.click(screen.getByLabelText(`Add to ${categoryName}`))

  // Several sections can have their form open at once, and every form has
  // a "Start time" and a "30m" chip. Searching inside this category's
  // section keeps us on the right one.
  const form = within(section(categoryName))

  const titleInput = form.getByLabelText(`New task in ${categoryName}`)
  fireEvent.change(titleInput, { target: { value: title } })

  if (day) {
    fireEvent.change(form.getByLabelText('Day'), { target: { value: day } })
  }

  fireEvent.change(form.getByLabelText('Start time'), {
    target: { value: time },
  })

  // The duration chips are buttons labelled "30m", "1h" and so on.
  fireEvent.click(form.getByRole('button', { name: formatDuration(durationMin) }))

  fireEvent.submit(titleInput.closest('form'))

  if (!keepOpen) fireEvent.click(form.getByRole('button', { name: 'Done' }))
}

test('the strip shows this week, with today marked', () => {
  render(<App />)

  const strip = within(screen.getByRole('navigation', { name: 'Week' }))
  expect(strip.getAllByRole('button', { name: /Today|Tomorrow|\d/ }).length).toBeGreaterThan(6)
  expect(dayButton(/^Today/).getAttribute('aria-current')).toBe('date')
  expect(dayButton(/^Today/).getAttribute('aria-pressed')).toBe('true')
})

test('only the selected day\'s tasks are shown', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00' })
  addTo('Chores', { title: 'Tomorrow laundry', time: '10:00', day: addDays(todayISO(), 1) })

  expect(screen.getByText('Laundry')).toBeTruthy()
  expect(screen.queryByText('Tomorrow laundry')).toBeNull()

  fireEvent.click(dayButton(/^Tomorrow/))

  expect(screen.getByText('Tomorrow laundry')).toBeTruthy()
  expect(screen.queryByText(/^Laundry$/)).toBeNull()
})

test('a new task lands on the day you are looking at', () => {
  render(<App />)
  fireEvent.click(dayButton(/^Tomorrow/))

  fireEvent.click(screen.getByLabelText('Add to Chores'))

  expect(within(section('Chores')).getByLabelText('Day').value).toBe(
    addDays(todayISO(), 1),
  )
})

test('the strip marks days that have tasks, and days that clash', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })

  expect(dayButton(/^Today, 1 tasks/)).toBeTruthy()

  addTo('Chores', { title: 'Dishes', time: '10:30' })

  expect(dayButton(/^Today, 2 tasks, has a clash/)).toBeTruthy()
})

test('the arrows move a week at a time, and Today comes back', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00' })

  fireEvent.click(screen.getByLabelText('Next week'))
  expect(screen.queryByText('Laundry')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Go to today' }))
  expect(screen.getByText('Laundry')).toBeTruthy()
})

test('swiping the strip moves a week', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00' })

  const strip = screen.getByRole('navigation', { name: 'Week' })
  // A touch that travels 120 pixels to the left: forward one week.
  fireEvent.touchStart(strip, { changedTouches: [{ clientX: 200 }] })
  fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 80 }] })

  expect(screen.queryByText('Laundry')).toBeNull()
})

test('editing a task moves it, and clears the clash on both', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })
  addTo('Chores', { title: 'Dishes', time: '10:30' })
  expect(screen.getAllByText(/Overlaps/)).toHaveLength(2)

  fireEvent.click(screen.getByLabelText('Edit Dishes'))
  // The +1h chip moves the whole task without touching the fields.
  fireEvent.click(within(section('Chores')).getByRole('button', { name: '+1h' }))
  fireEvent.click(within(section('Chores')).getByRole('button', { name: 'Save' }))

  expect(screen.queryByText(/Overlaps/)).toBeNull()
  expect(within(section('Chores')).getByText(/11:30–12:00/)).toBeTruthy()
})

test('editing can move a task to another day', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00' })

  fireEvent.click(screen.getByLabelText('Edit Laundry'))
  fireEvent.click(within(section('Chores')).getByRole('button', { name: 'Tomorrow' }))
  fireEvent.click(within(section('Chores')).getByRole('button', { name: 'Save' }))

  expect(screen.queryByText('Laundry')).toBeNull()

  fireEvent.click(dayButton(/^Tomorrow/))
  expect(screen.getByText('Laundry')).toBeTruthy()
})

test('cancelling an edit changes nothing', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00' })

  fireEvent.click(screen.getByLabelText('Edit Laundry'))
  fireEvent.click(within(section('Chores')).getByRole('button', { name: '+1h' }))
  fireEvent.click(within(section('Chores')).getByRole('button', { name: 'Cancel' }))

  expect(within(section('Chores')).getByText(/10:00–10:30/)).toBeTruthy()
})

test('a task shows its day and time range', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '14:00', durationMin: 90 })

  const chores = section('Chores')
  expect(within(chores).getByText('Laundry')).toBeTruthy()
  expect(within(chores).getByText(/Today · 14:00–15:30/)).toBeTruthy()
})

test('tasks are listed earliest first, whatever order they were added', () => {
  render(<App />)
  addTo('Chores', { title: 'Evening', time: '18:00' })
  addTo('Chores', { title: 'Morning', time: '08:00' })

  const titles = within(section('Chores'))
    .getAllByRole('listitem')
    .map((row) => within(row).getByText(/Morning|Evening/).textContent)

  expect(titles).toEqual(['Morning', 'Evening'])
})

test('a tentative task is marked with a tilde', () => {
  render(<App />)

  fireEvent.click(screen.getByLabelText('Add to Chores'))
  const titleInput = within(section('Chores')).getByLabelText(
    'New task in Chores',
  )
  fireEvent.change(titleInput, { target: { value: 'Maybe laundry' } })
  fireEvent.click(within(section('Chores')).getByLabelText('Tentative'))
  fireEvent.submit(titleInput.closest('form'))

  expect(within(section('Chores')).getByText('~')).toBeTruthy()
})

test('overlapping tasks are both flagged, in either category', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })
  addTo('Projects', { title: 'Dagen', time: '10:30', durationMin: 60 })

  expect(within(section('Chores')).getByText(/Overlaps Dagen/)).toBeTruthy()
  expect(within(section('Projects')).getByText(/Overlaps Laundry/)).toBeTruthy()
})

test('back-to-back tasks are not flagged', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })
  addTo('Chores', { title: 'Dishes', time: '11:00', durationMin: 30 })

  expect(screen.queryByText(/Overlaps/)).toBeNull()
})

test('moving one task clears the flag on both', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })
  addTo('Chores', { title: 'Dishes', time: '10:30', durationMin: 30 })
  expect(screen.getAllByText(/Overlaps/)).toHaveLength(2)

  // No editing yet (that's Phase 5), so delete one instead.
  fireEvent.click(screen.getByLabelText('Delete Dishes'))

  expect(screen.queryByText(/Overlaps/)).toBeNull()
})

test('ticking a task off frees its slot', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })
  addTo('Chores', { title: 'Dishes', time: '10:30', durationMin: 30 })

  fireEvent.click(within(section('Chores')).getAllByRole('checkbox')[0])

  expect(screen.queryByText(/Overlaps/)).toBeNull()
})

test('a clash on another day is not a clash', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })
  addTo('Chores', {
    title: 'Dishes',
    time: '10:00',
    durationMin: 60,
    day: addDays(todayISO(), 1),
  })

  expect(screen.queryByText(/Overlaps/)).toBeNull()

  fireEvent.click(dayButton(/^Tomorrow/))
  expect(screen.queryByText(/Overlaps/)).toBeNull()
})

test('the form warns before you add, and still lets you', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })

  // Open the form again and pick a time inside Laundry's hour.
  fireEvent.click(screen.getByLabelText('Add to Chores'))
  fireEvent.change(within(section('Chores')).getByLabelText('Start time'), {
    target: { value: '10:15' },
  })

  const form = within(section('Chores'))
    .getByLabelText('New task in Chores')
    .closest('form')
  expect(within(form).getByText(/Overlaps Laundry/)).toBeTruthy()
})

test('the next task starts when the last one ended', () => {
  render(<App />)
  addTo('Chores', {
    title: 'Laundry',
    time: '10:00',
    durationMin: 60,
    keepOpen: true,
  })

  expect(within(section('Chores')).getByLabelText('Start time').value).toBe(
    '11:00',
  )
})

test('collapsing a section hides its tasks, and is remembered', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '14:00' })

  fireEvent.click(headerOf('Chores'))
  expect(screen.queryByText('Laundry')).toBeNull()

  cleanup()
  render(<App />)

  expect(headerOf('Chores').getAttribute('aria-expanded')).toBe('false')
})

test('remembers tasks and their times after a reload', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '14:00', durationMin: 90 })

  cleanup()
  render(<App />)

  expect(within(section('Chores')).getByText(/14:00–15:30/)).toBeTruthy()
})

test('a task saved without a time gets a tentative slot today', () => {
  localStorage.setItem(
    'dagen.tasks.v1',
    JSON.stringify([
      { id: 'old', title: 'Laundry', categoryId: 'chores', status: 'todo' },
    ]),
  )

  render(<App />)

  const chores = section('Chores')
  expect(within(chores).getByText('Laundry')).toBeTruthy()
  expect(within(chores).getByText(/Today · 09:00–09:30/)).toBeTruthy()
  expect(within(chores).getByText('~')).toBeTruthy()
  expect(todayISO()).toBeTruthy()
})

// ---- recurring chores ----

// Adds a chore rule through the Repeats panel, then closes it.
function addChore({ title, category = 'Meals', repeat = 'daily', weekday, time }) {
  fireEvent.click(screen.getByRole('button', { name: 'Repeats' }))

  const panel = within(screen.getByRole('region', { name: 'Recurring chores' }))
  fireEvent.change(panel.getByLabelText('Chore name'), { target: { value: title } })
  fireEvent.change(panel.getByLabelText('Category'), { target: { value: category.toLowerCase() } })
  fireEvent.change(panel.getByLabelText('How often'), { target: { value: repeat } })

  if (weekday !== undefined) {
    fireEvent.change(panel.getByLabelText('Weekday'), { target: { value: String(weekday) } })
  }

  fireEvent.change(panel.getByLabelText('Chore time'), { target: { value: time } })
  fireEvent.click(panel.getByRole('button', { name: 'Add chore' }))
  fireEvent.click(screen.getByRole('button', { name: 'Repeats' }))
}

test('a daily chore appears today and on the days you visit', () => {
  render(<App />)
  addChore({ title: 'Cook dinner', time: '18:00' })

  expect(within(section('Meals')).getByText('Cook dinner')).toBeTruthy()

  fireEvent.click(dayButton(/^Tomorrow/))
  expect(within(section('Meals')).getByText('Cook dinner')).toBeTruthy()
})

test('a weekly chore only appears on its weekday', () => {
  render(<App />)
  // weekdayIndex counts Monday as 0, so 6 is Sunday.
  const sunday = weekDays(todayISO())[6]
  addChore({ title: 'Laundry', category: 'Chores', repeat: 'weekly', weekday: 6, time: '14:00' })

  const todayIsSunday = todayISO() === sunday
  expect(Boolean(screen.queryByText('Laundry'))).toBe(todayIsSunday)

  fireEvent.click(dayButton(new RegExp(`^${formatDay(sunday, new Date(`${todayISO()}T12:00`))}`)))
  expect(within(section('Chores')).getByText('Laundry')).toBeTruthy()
})

test('a chore is not made twice on the same day', () => {
  render(<App />)
  addChore({ title: 'Cook dinner', time: '18:00' })

  // Leave the day and come back: still one.
  fireEvent.click(dayButton(/^Tomorrow/))
  fireEvent.click(screen.getByRole('button', { name: 'Go to today' }))

  expect(within(section('Meals')).getAllByText('Cook dinner')).toHaveLength(1)
})

test("deleting a chore clears it for that day only", () => {
  render(<App />)
  addChore({ title: 'Cook dinner', time: '18:00' })

  fireEvent.click(screen.getByLabelText('Delete Cook dinner'))
  expect(screen.queryByText('Cook dinner')).toBeNull()

  // It stays gone when you come back to today...
  fireEvent.click(dayButton(/^Tomorrow/))
  expect(within(section('Meals')).getByText('Cook dinner')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Go to today' }))
  expect(screen.queryByText('Cook dinner')).toBeNull()
})

test("a chore you moved isn't made again", () => {
  render(<App />)
  addChore({ title: 'Cook dinner', time: '18:00' })

  fireEvent.click(screen.getByLabelText('Edit Cook dinner'))
  fireEvent.click(within(section('Meals')).getByRole('button', { name: '+1h' }))
  fireEvent.click(within(section('Meals')).getByRole('button', { name: 'Save' }))

  fireEvent.click(dayButton(/^Tomorrow/))
  fireEvent.click(screen.getByRole('button', { name: 'Go to today' }))

  expect(within(section('Meals')).getAllByText('Cook dinner')).toHaveLength(1)
  expect(within(section('Meals')).getByText(/19:00–19:30/)).toBeTruthy()
})

test('deleting the rule stops new copies but keeps the ones already there', () => {
  render(<App />)
  addChore({ title: 'Cook dinner', time: '18:00' })

  fireEvent.click(screen.getByRole('button', { name: 'Repeats' }))
  fireEvent.click(screen.getByLabelText('Delete the Cook dinner chore'))
  fireEvent.click(screen.getByRole('button', { name: 'Repeats' }))

  expect(within(section('Meals')).getByText('Cook dinner')).toBeTruthy()

  fireEvent.click(dayButton(/^Tomorrow/))
  expect(screen.queryByText('Cook dinner')).toBeNull()
})

test('chores survive a reload, without doubling up', () => {
  render(<App />)
  addChore({ title: 'Cook dinner', time: '18:00' })

  cleanup()
  render(<App />)

  expect(within(section('Meals')).getAllByText('Cook dinner')).toHaveLength(1)
})

// ---- Phase 11: unplaced tasks, any time, and Areas ----

function toPlace() {
  return within(section('To place'))
}

// Opens a category's add form, types a title, and hands back the form
// so the test can set whatever else it's checking.
function startAdding(categoryName, title) {
  fireEvent.click(screen.getByLabelText(`Add to ${categoryName}`))
  const form = within(section(categoryName))
  fireEvent.change(form.getByLabelText(`New task in ${categoryName}`), {
    target: { value: title },
  })
  return form
}

function submitAndClose(form, categoryName) {
  fireEvent.submit(form.getByLabelText(`New task in ${categoryName}`).closest('form'))
  fireEvent.click(form.getByRole('button', { name: 'Done' }))
}

test('a task saved with "No day yet" waits in To place, not on the day', () => {
  render(<App />)
  const form = startAdding('Personal', 'Update CV')
  fireEvent.click(form.getByRole('button', { name: 'No day yet' }))
  submitAndClose(form, 'Personal')

  expect(within(section('Personal')).queryByText('Update CV')).toBeNull()
  expect(toPlace().getByText('Update CV')).toBeTruthy()
  expect(toPlace().getByText(/Not placed · 30m/)).toBeTruthy()
  // And it doesn't count on the week strip.
  expect(dayButton(/^Today$/)).toBeTruthy()
})

test('an unplaced task survives a reload and can be given a day', () => {
  render(<App />)
  const form = startAdding('Personal', 'Update CV')
  fireEvent.click(form.getByRole('button', { name: 'No day yet' }))
  submitAndClose(form, 'Personal')

  cleanup()
  render(<App />)

  expect(toPlace().getByText('Update CV')).toBeTruthy()

  fireEvent.click(toPlace().getByLabelText('Edit Update CV'))
  fireEvent.change(toPlace().getByLabelText('Day'), { target: { value: todayISO() } })
  fireEvent.change(toPlace().getByLabelText('Start time'), { target: { value: '10:00' } })
  fireEvent.click(toPlace().getByRole('button', { name: 'Save' }))

  expect(toPlace().queryByText('Update CV')).toBeNull()
  expect(within(section('Personal')).getByText(/10:00–10:30/)).toBeTruthy()
})

test('"Any time" keeps a task on the day, after the timed ones, with no clash', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00', durationMin: 60 })

  const form = startAdding('Chores', 'Tidy desk')
  fireEvent.change(form.getByLabelText('Start time'), { target: { value: '' } })
  submitAndClose(form, 'Chores')

  const chores = within(section('Chores'))
  expect(chores.getByText(/Any time · 30m/)).toBeTruthy()
  const titles = chores.getAllByText(/Laundry|Tidy desk/).map((node) => node.textContent)
  expect(titles).toEqual(['Laundry', 'Tidy desk'])
  expect(screen.queryByText(/Overlaps/)).toBeNull()
  expect(dayButton(/^Today, 2 tasks$/)).toBeTruthy()
})

test('the time list is switched off until there is a day', () => {
  render(<App />)
  const form = startAdding('Chores', 'Something')
  fireEvent.click(form.getByRole('button', { name: 'No day yet' }))

  expect(form.getByLabelText('Start time').disabled).toBe(true)
  expect(form.getByRole('button', { name: '+1h' }).disabled).toBe(true)
})

// Adds an Area through the Areas panel and leaves the panel open.
function addArea({ name, category = 'projects', status = 'active', hours = '0' }) {
  if (!screen.queryByRole('region', { name: 'Areas' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Areas' }))
  }
  const panel = within(screen.getByRole('region', { name: 'Areas' }))
  fireEvent.change(panel.getByLabelText('New Area name'), { target: { value: name } })
  fireEvent.change(panel.getAllByLabelText('Area category').at(-1), { target: { value: category } })
  fireEvent.change(panel.getAllByLabelText('Status').at(-1), { target: { value: status } })
  fireEvent.change(panel.getAllByLabelText('Hours per month').at(-1), { target: { value: hours } })
  fireEvent.click(panel.getByRole('button', { name: 'Add Area' }))
  return panel
}

test('an Area can be added, and is remembered after a reload', () => {
  render(<App />)
  const panel = addArea({ name: 'Räckvidd (NAVET)', hours: '20' })

  expect(panel.getByText('Räckvidd (NAVET)')).toBeTruthy()
  expect(panel.getByText(/Active · 20h\/month · last worked never/)).toBeTruthy()

  cleanup()
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Areas' }))

  expect(screen.getByText('Räckvidd (NAVET)')).toBeTruthy()
})

test('an Area needs a name, and the budget cannot be negative', () => {
  render(<App />)
  const panel = addArea({ name: '   ' })
  expect(panel.getByRole('alert').textContent).toBe('Add a name first.')

  addArea({ name: 'Swedish', hours: '-3' })
  expect(panel.getByRole('alert').textContent).toBe('Hours per month must be 0 or more.')
  // Neither attempt made an Area.
  expect(panel.queryByLabelText('Edit Swedish')).toBeNull()
})

test('an Area can be edited', () => {
  render(<App />)
  const panel = addArea({ name: 'Swedish', category: 'learning' })

  fireEvent.click(panel.getByLabelText('Edit Swedish'))
  fireEvent.change(panel.getByLabelText('Name of Swedish'), { target: { value: 'Swedish B1' } })
  fireEvent.change(panel.getAllByLabelText('Status')[0], { target: { value: 'maintain' } })
  fireEvent.click(panel.getByRole('button', { name: 'Save' }))

  expect(panel.getByText('Swedish B1')).toBeTruthy()
  expect(panel.getByText(/Maintain · 0h\/month/)).toBeTruthy()
})

test('an unused Area is deleted straight away', () => {
  render(<App />)
  const panel = addArea({ name: 'Gesture bloom' })

  fireEvent.click(panel.getByLabelText('Delete Gesture bloom'))

  expect(panel.queryByText('Gesture bloom')).toBeNull()
})

test('picking an Area in the form sets the task\'s category and shows on the row', () => {
  render(<App />)
  addArea({ name: 'Räckvidd', category: 'projects' })
  fireEvent.click(screen.getByRole('button', { name: 'Areas' })) // close the panel

  // Added from Personal, but the Area lives in Projects.
  const form = startAdding('Personal', 'Touch screen test')
  fireEvent.change(form.getByLabelText('Area'), {
    target: { value: within(form.getByLabelText('Area')).getByText('Räckvidd').value },
  })
  submitAndClose(form, 'Personal')

  expect(within(section('Personal')).queryByText('Touch screen test')).toBeNull()
  const projects = within(section('Projects'))
  expect(projects.getByText('Touch screen test')).toBeTruthy()
  expect(projects.getByText(/· Räckvidd/)).toBeTruthy()
})

test('deleting an Area with tasks asks first, then archives it and keeps the name', () => {
  render(<App />)
  addArea({ name: 'Räckvidd', category: 'projects' })
  fireEvent.click(screen.getByRole('button', { name: 'Areas' }))

  const form = startAdding('Projects', 'Touch screen test')
  fireEvent.change(form.getByLabelText('Area'), {
    target: { value: within(form.getByLabelText('Area')).getByText('Räckvidd').value },
  })
  submitAndClose(form, 'Projects')

  fireEvent.click(screen.getByRole('button', { name: 'Areas' }))
  const panel = within(screen.getByRole('region', { name: 'Areas' }))

  // Step one: asks.
  fireEvent.click(panel.getByLabelText('Delete Räckvidd'))
  expect(panel.getByText(/still has 1 task. Archive it\?/)).toBeTruthy()

  // "Keep" backs out.
  fireEvent.click(panel.getByRole('button', { name: 'Keep' }))
  expect(panel.getByLabelText('Edit Räckvidd')).toBeTruthy()

  // Step two: archives.
  fireEvent.click(panel.getByLabelText('Delete Räckvidd'))
  fireEvent.click(panel.getByRole('button', { name: 'Archive' }))

  expect(panel.getByText('Archived')).toBeTruthy()
  expect(panel.getByLabelText('Restore Räckvidd')).toBeTruthy()

  // The task keeps its Area's name, greyed out.
  const areaName = within(section('Projects')).getByText(/· Räckvidd/)
  expect(areaName.className).toContain('archived')
})

test('more active Areas than the limit is a warning, not a block', () => {
  render(<App />)
  for (const name of ['A1', 'A2', 'A3', 'A4', 'A5']) addArea({ name: name })
  expect(screen.queryByText(/more than your limit/)).toBeNull()

  addArea({ name: 'A6' })
  expect(screen.getByText(/6 active Areas, more than your limit of 5/)).toBeTruthy()
  expect(screen.getByText('A6')).toBeTruthy()
})

test('settings are saved', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Areas' }))
  fireEvent.change(screen.getByLabelText('Free hours, weekdays'), { target: { value: '6.5' } })
  fireEvent.change(screen.getByLabelText('Active Area limit'), { target: { value: '4' } })

  cleanup()
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Areas' }))

  expect(screen.getByLabelText('Free hours, weekdays').value).toBe('6.5')
  expect(screen.getByLabelText('Active Area limit').value).toBe('4')
})

test('ticking a task notes when it was done, and unticking clears it', () => {
  render(<App />)
  addTo('Chores', { title: 'Laundry', time: '10:00' })

  fireEvent.click(within(section('Chores')).getByRole('checkbox'))
  const saved = () => JSON.parse(localStorage.getItem('dagen.tasks.v1'))[0]
  expect(saved().doneAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

  fireEvent.click(within(section('Chores')).getByRole('checkbox'))
  expect(saved().doneAt).toBeNull()
})

// ---- Phase 12: tabs, Week, rollover, To place ----

// Puts tasks straight into storage, as if saved earlier, with every
// Phase 11 field filled in.
function seed(tasks) {
  localStorage.setItem(
    'dagen.tasks.v1',
    JSON.stringify(
      tasks.map((task) => ({
        categoryId: 'personal',
        status: 'todo',
        durationMin: 60,
        tentative: false,
        start: null,
        day: null,
        areaId: null,
        fixed: false,
        due: null,
        priority: false,
        rolled: 0,
        doneAt: null,
        ...task,
      })),
    ),
  )
}

function openTab(name) {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Views' })).getByRole('button', { name: name }))
}

function weekScreen() {
  return within(screen.getByRole('region', { name: 'Week' }))
}

const today = todayISO()
const yesterday = addDays(today, -1)

test('the tabs switch between Day and Week, and the others are coming soon', () => {
  render(<App />)
  expect(screen.queryByRole('region', { name: 'Week' })).toBeNull()

  openTab('Week')
  expect(weekScreen().getByText(new RegExp(`^Week ${isoWeek(today)} has`))).toBeTruthy()
  expect(window.location.hash).toBe('#week')
  expect(screen.getByRole('button', { name: 'Month (coming soon)' }).disabled).toBe(true)

  openTab('Day')
  expect(screen.queryByRole('region', { name: 'Week' })).toBeNull()
})

test('the app reopens on the screen in the address', () => {
  window.history.replaceState(null, '', '/#week')
  render(<App />)
  expect(screen.getByRole('region', { name: 'Week' })).toBeTruthy()
})

test('the Day screen states how much of the day is free', () => {
  // Weekdays have 8h, weekends 4h (the default settings).
  seed([{ id: 'a', title: 'Essay', day: today, durationMin: 90 }])
  render(<App />)

  const weekend = ['Saturday', 'Sunday'].includes(weekdayName(today))
  const free = weekend ? '2.5h' : '6.5h'
  expect(screen.getByRole('heading', { name: `${weekdayName(today)} · ${free} free` })).toBeTruthy()
  expect(screen.getByText(new RegExp(`0h fixed · 1.5h planned · ${free} free`))).toBeTruthy()
})

test('an overpacked day says so, counting fixed events', () => {
  seed([
    { id: 'f', title: 'Crit', fixed: true, start: `${today}T09:00`, durationMin: 120 },
    { id: 'a', title: 'Model', day: today, durationMin: 600 },
  ])
  render(<App />)

  // 2h fixed + 10h planned is over by 4h on a weekday, 8h at a weekend.
  const weekend = ['Saturday', 'Sunday'].includes(weekdayName(today))
  expect(
    screen.getByRole('heading', {
      name: `${weekdayName(today)} is overpacked by ${weekend ? '8h' : '4h'}`,
    }),
  ).toBeTruthy()

  openTab('Week')
  expect(weekScreen().getByRole('heading', { name: `${weekdayName(today)} is overpacked` })).toBeTruthy()
})

test('the Week screen shows each day\'s tasks, fixed ones marked', () => {
  seed([
    { id: 'f', title: 'Crit', fixed: true, start: `${today}T13:00`, durationMin: 60 },
    { id: 'a', title: 'Read', day: today },
  ])
  render(<App />)
  openTab('Week')

  const day = within(weekScreen().getByRole('region', { name: formatShortDay(today) }))
  expect(day.getByText('Crit')).toBeTruthy()
  expect(day.getByRole('img', { name: 'Fixed' })).toBeTruthy()
  expect(day.getByText(/any time · 1h/)).toBeTruthy()
})

test('a task can be edited from the Week screen', () => {
  seed([{ id: 'a', title: 'Read', day: today }])
  render(<App />)
  openTab('Week')

  const day = within(weekScreen().getByRole('region', { name: formatShortDay(today) }))
  fireEvent.click(day.getByLabelText('Edit Read'))
  fireEvent.change(day.getByLabelText('Edit Read', { selector: 'input' }), {
    target: { value: 'Read chapter 3' },
  })
  fireEvent.click(day.getByRole('button', { name: 'Save' }))

  expect(day.getByText('Read chapter 3')).toBeTruthy()
})

test('the arrows move the Week screen a week at a time', () => {
  render(<App />)
  openTab('Week')
  fireEvent.click(weekScreen().getByLabelText('Next week'))
  expect(weekScreen().getByText(new RegExp(`^Week ${isoWeek(addDays(today, 7))} has`))).toBeTruthy()
  fireEvent.click(weekScreen().getByLabelText('Go to this week'))
  expect(weekScreen().getByText(new RegExp(`^Week ${isoWeek(today)} has`))).toBeTruthy()
})

test('priorities this week are listed', () => {
  seed([
    { id: 'p', title: 'Portfolio draft', priority: true, day: today },
    { id: 'n', title: 'Not a priority', day: today },
  ])
  render(<App />)
  openTab('Week')

  const priorities = within(screen.getByRole('region', { name: 'Priorities this week' }))
  expect(priorities.getByText('Portfolio draft')).toBeTruthy()
  expect(priorities.queryByText('Not a priority')).toBeNull()
})

test('unfinished work from yesterday is offered back, and moves on a yes', () => {
  seed([{ id: 'a', title: 'Write report', day: yesterday }])
  render(<App />)

  expect(screen.getByText(/1 task didn’t happen\. Move them to To place\?/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Move them' }))

  expect(screen.queryByText(/didn’t happen/)).toBeNull()
  expect(toPlace().getByText('Write report')).toBeTruthy()
  expect(toPlace().getByText('pushed 1×')).toBeTruthy()
})

test('"Not now" leaves the tasks alone and is not asked again today', () => {
  seed([{ id: 'a', title: 'Write report', day: yesterday }])
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(screen.queryByText(/didn’t happen/)).toBeNull()
  expect(toPlace().queryByText('Write report')).toBeNull()

  cleanup()
  render(<App />)
  expect(screen.queryByText(/didn’t happen/)).toBeNull()
})

test('fixed, done and recurring tasks are never offered for rollover', () => {
  seed([
    { id: 'f', title: 'Lecture', fixed: true, start: `${yesterday}T10:00` },
    { id: 'd', title: 'Done', day: yesterday, status: 'done' },
    { id: 'c', title: 'Cook', day: yesterday, templateId: 'cook' },
  ])
  render(<App />)
  expect(screen.queryByText(/didn’t happen/)).toBeNull()
})

test('with rollover switched off, nothing is asked', () => {
  seed([{ id: 'a', title: 'Write report', day: yesterday }])
  localStorage.setItem(
    'dagen.settings.v1',
    JSON.stringify({ capacity: { weekday: 8, weekend: 4 }, activeAreaLimit: 5, rolloverEnabled: false }),
  )
  render(<App />)
  expect(screen.queryByText(/didn’t happen/)).toBeNull()
})

test('"Place on…" puts a task on a day, any time', () => {
  seed([{ id: 'a', title: 'Update CV' }])
  render(<App />)

  fireEvent.change(toPlace().getByLabelText('Place Update CV on a day'), { target: { value: today } })

  expect(toPlace().queryByText('Update CV')).toBeNull()
  expect(within(section('Personal')).getByText(/Any time · 1h/)).toBeTruthy()
})

test('To place shows when to start, earliest first', () => {
  seed([
    { id: 'later', title: 'Later', due: addDays(today, 20) },
    { id: 'soon', title: 'Soon', due: addDays(today, 1) },
  ])
  render(<App />)

  const titles = toPlace().getAllByText(/^(Later|Soon)$/).map((node) => node.textContent)
  expect(titles).toEqual(['Soon', 'Later'])
  expect(toPlace().getByText('start now')).toBeTruthy()
  expect(toPlace().getByText(`start by ${formatShortDay(addDays(today, 18))}`)).toBeTruthy()
})

test('a task pushed 3 times can be halved', () => {
  seed([{ id: 'a', title: 'Big essay', durationMin: 240, rolled: 3 }])
  render(<App />)

  fireEvent.click(toPlace().getByRole('button', { name: 'Halve it' }))

  expect(toPlace().getByText(/Not placed · 2h$/)).toBeTruthy()
  expect(toPlace().queryByText(/pushed/)).toBeNull()
  expect(toPlace().queryByRole('button', { name: 'Halve it' })).toBeNull()
})

test('a task pushed 3 times can be dropped, and Undo brings it back', () => {
  seed([{ id: 'a', title: 'Big essay', rolled: 3 }])
  render(<App />)

  fireEvent.click(toPlace().getByRole('button', { name: 'Drop' }))
  expect(toPlace().queryByText('Big essay')).toBeNull()
  expect(screen.getByText('Dropped Big essay.')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(toPlace().getByText('Big essay')).toBeTruthy()
  expect(screen.queryByText('Dropped Big essay.')).toBeNull()
})

test('the form explains what is missing instead of doing nothing', () => {
  render(<App />)
  fireEvent.click(screen.getByLabelText('Add to Chores'))
  const form = within(section('Chores'))

  fireEvent.submit(form.getByLabelText('New task in Chores').closest('form'))
  expect(form.getByRole('alert').textContent).toBe('Add a title first.')
})

test('a fixed event needs a time, and cannot be parked without a day', () => {
  render(<App />)
  const form = startAdding('Classes', 'Crit')
  fireEvent.click(form.getByRole('button', { name: 'Fixed event' }))

  expect(form.queryByRole('button', { name: 'No day yet' })).toBeNull()
  expect(form.queryByLabelText('Tentative')).toBeNull()

  fireEvent.change(form.getByLabelText('Start time'), { target: { value: '' } })
  fireEvent.submit(form.getByLabelText('New task in Classes').closest('form'))
  expect(form.getByRole('alert').textContent).toBe('Fixed events need a start time.')

  fireEvent.change(form.getByLabelText('Start time'), { target: { value: '13:00' } })
  fireEvent.submit(form.getByLabelText('New task in Classes').closest('form'))
  fireEvent.click(form.getByRole('button', { name: 'Done' }))

  expect(within(section('Classes')).getByRole('img', { name: 'Fixed' })).toBeTruthy()
})

test('a deadline and priority can be set in the form', () => {
  render(<App />)
  const form = startAdding('Projects', 'Exhibit text')
  fireEvent.click(form.getByRole('button', { name: 'No day yet' }))
  fireEvent.change(form.getByLabelText('Deadline (optional)'), {
    target: { value: addDays(today, 1) },
  })
  fireEvent.click(form.getByLabelText('Priority'))
  submitAndClose(form, 'Projects')

  expect(toPlace().getByText('start now')).toBeTruthy()
  expect(toPlace().getByRole('img', { name: 'Priority' })).toBeTruthy()
})

// ---- Phase 13: the timer and time log ----

function nowBar() {
  return within(screen.getByRole('region', { name: 'Now' }))
}

function timeLog() {
  return within(screen.getByRole('region', { name: 'Time log' }))
}

// A timer as if started some minutes ago (and saved), so stopping it
// makes a real entry without the test having to wait.
function seedTimer(minutesAgo, details = {}) {
  localStorage.setItem(
    'dagen.timer.v1',
    JSON.stringify({
      taskId: null,
      areaId: null,
      categoryId: 'learning',
      label: 'Reading',
      startedAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      ...details,
    }),
  )
}

function savedEntries() {
  return JSON.parse(localStorage.getItem('dagen.entries.v1') ?? '[]')
}

test('with nothing running, the Now bar offers Log time', () => {
  render(<App />)
  expect(nowBar().getByText('Nothing running')).toBeTruthy()
  expect(nowBar().getByRole('button', { name: 'Log time' })).toBeTruthy()
  // Nothing tracked yet, so nothing to resume.
  expect(nowBar().queryByRole('button', { name: /^Resume/ })).toBeNull()
})

test('Start on a task runs its timer, and the row says running', () => {
  seed([{ id: 'a', title: 'Essay', start: `${today}T10:00`, categoryId: 'learning' }])
  render(<App />)

  fireEvent.click(within(section('Learning')).getByLabelText('Start Essay'))

  expect(nowBar().getByText('Essay')).toBeTruthy()
  expect(nowBar().getByLabelText('Time so far').textContent).toMatch(/^\d\d:\d\d:\d\d$/)
  expect(within(section('Learning')).getByText('running')).toBeTruthy()
})

test('a running timer survives a reload', () => {
  seedTimer(5)
  render(<App />)
  expect(nowBar().getByText('Reading')).toBeTruthy()

  cleanup()
  render(<App />)
  expect(nowBar().getByText('Reading')).toBeTruthy()
  expect(nowBar().getByLabelText('Time so far').textContent).toMatch(/^00:0[45]:\d\d$/)
})

test('stopping saves exactly one entry, shown in the day\'s time log', () => {
  seedTimer(30)
  render(<App />)

  fireEvent.click(nowBar().getByRole('button', { name: 'Stop' }))

  expect(nowBar().getByText('Nothing running')).toBeTruthy()
  expect(savedEntries()).toHaveLength(1)
  expect(savedEntries()[0]).toMatchObject({ label: 'Reading', source: 'timer', categoryId: 'learning' })
  expect(timeLog().getByText('Reading')).toBeTruthy()
  expect(timeLog().getByText(/30m · timer/)).toBeTruthy()
})

test('a new start stops the old timer and saves it', () => {
  seedTimer(20)
  seed([{ id: 'a', title: 'Essay', start: `${today}T10:00`, categoryId: 'learning' }])
  render(<App />)

  fireEvent.click(within(section('Learning')).getByLabelText('Start Essay'))

  expect(nowBar().getByText('Essay')).toBeTruthy()
  expect(savedEntries()).toHaveLength(1)
  expect(savedEntries()[0].label).toBe('Reading')
})

test('under a minute is thrown away, and the app says so', () => {
  seed([{ id: 'a', title: 'Essay', start: `${today}T10:00`, categoryId: 'learning' }])
  render(<App />)

  fireEvent.click(within(section('Learning')).getByLabelText('Start Essay'))
  fireEvent.click(nowBar().getByRole('button', { name: 'Stop' }))

  expect(screen.getByText('Under a minute, so it wasn’t saved.')).toBeTruthy()
  expect(savedEntries()).toEqual([])
})

test('Resume last restarts what was tracked most recently', () => {
  seedTimer(15)
  render(<App />)
  fireEvent.click(nowBar().getByRole('button', { name: 'Stop' }))

  fireEvent.click(nowBar().getByRole('button', { name: 'Resume Reading' }))
  expect(nowBar().getByText('Reading')).toBeTruthy()
  expect(nowBar().getByRole('button', { name: 'Stop' })).toBeTruthy()
})

test('a past block with nothing logged offers Log as planned, once', () => {
  seed([{ id: 'a', title: 'Lab report', start: `${yesterday}T10:00`, durationMin: 90, categoryId: 'learning' }])
  // Yesterday's task would otherwise trigger the morning question.
  localStorage.setItem('dagen.rolloverAsked.v1', today)
  render(<App />)
  fireEvent.click(dayButton(new RegExp(`^${formatDay(yesterday)}`)))

  fireEvent.click(within(section('Learning')).getByRole('button', { name: 'Log as planned' }))

  expect(within(section('Learning')).queryByRole('button', { name: 'Log as planned' })).toBeNull()
  expect(timeLog().getByText(/10:00–11:30 · 1h 30m · as planned/)).toBeTruthy()
  expect(savedEntries()).toHaveLength(1)
})

test('time can be logged by hand, and must end after it starts', () => {
  render(<App />)
  fireEvent.click(nowBar().getByRole('button', { name: 'Log time' }))
  const form = within(screen.getByRole('region', { name: 'Log time' }))

  fireEvent.change(form.getByLabelText('What you worked on'), { target: { value: 'Sketching' } })
  fireEvent.change(form.getByLabelText('Day of this time'), { target: { value: today } })
  fireEvent.change(form.getByLabelText('From'), { target: { value: '14:00' } })
  fireEvent.change(form.getByLabelText('To'), { target: { value: '14:00' } })
  fireEvent.click(form.getByRole('button', { name: 'Save' }))
  expect(form.getByRole('alert').textContent).toBe('The end must be after the start.')

  fireEvent.change(form.getByLabelText('To'), { target: { value: '15:15' } })
  fireEvent.click(form.getByRole('button', { name: 'Save' }))

  expect(screen.queryByRole('region', { name: 'Log time' })).toBeNull()
  expect(timeLog().getByText(/14:00–15:15 · 1h 15m · by hand/)).toBeTruthy()
})

test('an entry can be edited, and deleted with Undo', () => {
  localStorage.setItem(
    'dagen.entries.v1',
    JSON.stringify([
      {
        id: 'e1',
        taskId: null,
        areaId: null,
        categoryId: 'learning',
        label: 'Reading',
        start: `${today}T09:00`,
        end: `${today}T10:00`,
        source: 'timer',
      },
    ]),
  )
  render(<App />)

  fireEvent.click(timeLog().getByLabelText('Edit time: Reading'))
  const form = within(screen.getByRole('region', { name: 'Edit time' }))
  fireEvent.change(form.getByLabelText('To'), { target: { value: '10:30' } })
  fireEvent.click(form.getByRole('button', { name: 'Save' }))
  expect(timeLog().getByText(/09:00–10:30 · 1h 30m · timer/)).toBeTruthy()

  fireEvent.click(timeLog().getByLabelText('Delete time: Reading'))
  expect(timeLog().queryByText('Reading')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(timeLog().getByText('Reading')).toBeTruthy()
})
