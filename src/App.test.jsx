/*
  App.test.jsx — tests for the app as a person would use it.

  Phase 1's tests had one add box; now every category has its own, so
  these tests were rewritten. That's normal: when behaviour changes on
  purpose, the tests describing it change with it.
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

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

// Finds one category's section, so we can search inside just that part
// of the page. getByRole('region', ...) matches the <section> because it
// has an aria-label.
function section(name) {
  return screen.getByRole('region', { name: name })
}

// The header button is the one carrying aria-expanded; the + button
// beside it doesn't, so this tells them apart.
function headerOf(categoryName) {
  return within(section(categoryName))
    .getAllByRole('button')
    .find((button) => button.hasAttribute('aria-expanded'))
}

// Opens a category's add box, types a title and submits it.
function addTo(categoryName, title) {
  fireEvent.click(screen.getByLabelText(`Add to ${categoryName}`))

  const input = screen.getByLabelText(`New task in ${categoryName}`)
  fireEvent.change(input, { target: { value: title } })
  fireEvent.submit(input.closest('form'))
}

test('shows a section for every category', () => {
  render(<App />)

  expect(section('Chores')).toBeTruthy()
  expect(section('Projects')).toBeTruthy()
  expect(screen.getAllByRole('region')).toHaveLength(8)
})

test('a task is added to the category whose + was used', () => {
  render(<App />)
  addTo('Chores', 'Laundry')

  // within(...) searches inside one element only.
  expect(within(section('Chores')).getByText('Laundry')).toBeTruthy()
  expect(within(section('Projects')).queryByText('Laundry')).toBeNull()
})

test('the counter shows how many are left in that category', () => {
  render(<App />)
  addTo('Chores', 'Laundry')
  addTo('Chores', 'Dishes')

  const chores = section('Chores')
  fireEvent.click(within(chores).getAllByRole('checkbox')[0])

  // The count sits next to the category name in the header.
  expect(within(chores).getByText('1')).toBeTruthy()
})

test('deleting removes only that task', () => {
  render(<App />)
  addTo('Chores', 'Laundry')
  addTo('Chores', 'Dishes')

  fireEvent.click(screen.getByLabelText('Delete Dishes'))

  expect(screen.queryByText('Dishes')).toBeNull()
  expect(screen.getByText('Laundry')).toBeTruthy()
})

test('collapsing a section hides its tasks', () => {
  render(<App />)
  addTo('Chores', 'Laundry')

  fireEvent.click(headerOf('Chores'))

  expect(screen.queryByText('Laundry')).toBeNull()
})

test('remembers tasks and collapsed sections after a reload', () => {
  render(<App />)
  addTo('Chores', 'Laundry')
  fireEvent.click(headerOf('Chores'))

  cleanup()
  render(<App />) // like reloading the page: only storage survives

  expect(headerOf('Chores').getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByText('Laundry')).toBeNull()
})
