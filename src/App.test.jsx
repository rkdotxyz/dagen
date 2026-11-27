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
  todayISO,
  weekDays,
} from './lib/dates.js'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
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
