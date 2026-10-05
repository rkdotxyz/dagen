/*
  App.test.jsx — tests for the app as a person would use it.

  Every task now has a day, a time and a length, so the helper below
  fills the whole form: title, time, duration chip, then Add.
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
import { formatDuration, todayISO } from './lib/dates.js'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

function section(name) {
  return screen.getByRole('region', { name: name })
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
  addTo('Chores', { title: 'Dishes', time: '10:00', durationMin: 60, day: '2026-12-24' })

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
