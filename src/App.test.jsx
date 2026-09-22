/*
  App.test.jsx — tests for the task list as a user would use it.

  Instead of calling functions directly, these tests draw the whole App
  in the pretend browser, then type, click and read the screen, the way
  you would. If a future phase breaks adding, ticking, deleting or
  remembering, one of these goes red.
*/

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import App from './App.jsx'

// Start every test with empty storage...
beforeEach(() => {
  localStorage.clear()
})

// ...and remove the drawn App after every test, so the next one starts
// with a blank page.
afterEach(() => {
  cleanup()
})

// A helper used by several tests: type a title and submit the form.
function addTask(title) {
  // getByLabelText finds the input by its accessible name (aria-label).
  // Tests that find things the way people and screen readers do stay
  // valid even if the layout changes.
  const input = screen.getByLabelText('Task name')
  fireEvent.change(input, { target: { value: title } })
  fireEvent.submit(input.closest('form'))
}

test('shows an empty message when there are no tasks', () => {
  render(<App />)
  // getByText throws (and fails the test) if the text isn't on screen.
  // /.../ is a pattern: "contains this text".
  expect(screen.getByText(/No tasks yet/)).toBeTruthy()
})

test('adds a task and clears the box', () => {
  render(<App />)
  addTask('  Laundry  ')

  // getByText ignores extra spaces when searching, so to be sure the
  // spaces were really removed, compare the row's exact text.
  expect(screen.getByText('Laundry').textContent).toBe('Laundry')
  expect(screen.getByLabelText('Task name').value).toBe('')
})

test('ignores a task that is only spaces', () => {
  render(<App />)
  addTask('   ')

  // queryAllBy... returns an empty list instead of throwing.
  expect(screen.queryAllByRole('listitem')).toHaveLength(0)
})

test('ticking a task updates the counter', () => {
  render(<App />)
  addTask('Laundry')
  addTask('Cook')

  fireEvent.click(screen.getAllByRole('checkbox')[0])

  expect(screen.getByText('1 of 2 left')).toBeTruthy()
})

test('deletes the right task', () => {
  render(<App />)
  addTask('Laundry')
  addTask('Cook')

  fireEvent.click(screen.getByLabelText('Delete Cook'))

  expect(screen.queryByText('Cook')).toBeNull()
  expect(screen.getByText('Laundry')).toBeTruthy()
})

test('remembers tasks and ticks after a reload', () => {
  render(<App />)
  addTask('Laundry')
  fireEvent.click(screen.getByRole('checkbox'))

  // "Reload": remove the App and draw a brand new one.
  // Only localStorage survives, just like a real page reload.
  cleanup()
  render(<App />)

  expect(screen.getByText('Laundry')).toBeTruthy()
  expect(screen.getByRole('checkbox').checked).toBe(true)
})
