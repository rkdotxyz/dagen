/*
  storage.test.js — tests for src/lib/storage.js.

  A test is a small program that uses your code and checks the result.
  Vitest finds every file ending in .test.js / .test.jsx and runs it.

  These are "unit tests": they test one small piece (save and load)
  on its own, without drawing any screens.
*/

import { beforeEach, describe, expect, test } from 'vitest'
import { loadTasks, saveTasks } from './storage.js'

// describe(...) groups related tests under one heading in the results.
describe('storage', () => {
  // beforeEach runs before EVERY test below. Wiping storage first means
  // each test starts from the same clean state and can't affect the others.
  beforeEach(() => {
    localStorage.clear()
  })

  // test('what should happen', () => { ...code that checks it... })
  test('returns an empty list when nothing is saved', () => {
    // expect(actual).toEqual(expected) fails the test if they differ.
    expect(loadTasks()).toEqual([])
  })

  test('loads back exactly what was saved', () => {
    const tasks = [
      { id: 'a', title: 'Laundry', status: 'todo' },
      { id: 'b', title: 'Cook', status: 'done' },
    ]
    saveTasks(tasks)
    expect(loadTasks()).toEqual(tasks)
  })

  test('returns an empty list instead of crashing on damaged data', () => {
    // Put broken text where the list should be, like a half-written save.
    localStorage.setItem('dagen.tasks.v1', '{not valid json')
    expect(loadTasks()).toEqual([])
  })
})
