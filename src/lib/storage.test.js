/*
  storage.test.js — tests for src/lib/storage.js.

  Unit tests: they check one small piece on its own, with no screens drawn.
*/

import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_CATEGORY_ID } from '../config.js'
import { todayISO } from './dates.js'
import {
  loadCollapsed,
  loadSkipped,
  loadTasks,
  loadTemplates,
  saveCollapsed,
  loadSent,
  saveSent,
  saveSkipped,
  saveTasks,
  saveTemplates,
} from './storage.js'

describe('tasks in storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('returns an empty list when nothing is saved', () => {
    expect(loadTasks()).toEqual([])
  })

  test('loads back exactly what was saved', () => {
    const tasks = [
      {
        id: 'a',
        title: 'Laundry',
        categoryId: 'chores',
        start: '2026-10-05T14:00',
        durationMin: 90,
        tentative: false,
        status: 'todo',
      },
      {
        id: 'b',
        title: 'Cook',
        categoryId: 'meals',
        start: '2026-10-05T18:00',
        durationMin: 60,
        tentative: false,
        status: 'done',
      },
    ]
    saveTasks(tasks)
    expect(loadTasks()).toEqual(tasks)
  })

  test('gives Phase 1 tasks the default category', () => {
    // A task saved before categories existed: no categoryId at all.
    localStorage.setItem(
      'dagen.tasks.v1',
      JSON.stringify([{ id: 'old', title: 'Laundry', status: 'todo' }]),
    )

    expect(loadTasks()[0].categoryId).toBe(DEFAULT_CATEGORY_ID)
  })

  test('rescues a task whose category no longer exists', () => {
    // You renamed or removed "oldstuff" in config.js; the task stays.
    localStorage.setItem(
      'dagen.tasks.v1',
      JSON.stringify([
        { id: 'x', title: 'Fix bike', categoryId: 'oldstuff', status: 'todo' },
      ]),
    )

    expect(loadTasks()[0].categoryId).toBe(DEFAULT_CATEGORY_ID)
  })

  test('gives a task with no time a tentative slot today', () => {
    localStorage.setItem(
      'dagen.tasks.v1',
      JSON.stringify([
        { id: 'old', title: 'Laundry', categoryId: 'chores', status: 'todo' },
      ]),
    )

    const task = loadTasks()[0]

    expect(task.start).toBe(`${todayISO()}T09:00`)
    expect(task.durationMin).toBe(30)
    expect(task.tentative).toBe(true)
  })

  test('leaves a task that already has a time alone', () => {
    localStorage.setItem(
      'dagen.tasks.v1',
      JSON.stringify([
        {
          id: 'x',
          title: 'Dentist',
          categoryId: 'appointments',
          start: '2026-10-05T10:00',
          durationMin: 45,
          tentative: false,
          status: 'todo',
        },
      ]),
    )

    expect(loadTasks()[0].start).toBe('2026-10-05T10:00')
  })

  test('returns an empty list instead of crashing on damaged data', () => {
    localStorage.setItem('dagen.tasks.v1', '{not valid json')
    expect(loadTasks()).toEqual([])
  })
})

describe('collapsed sections in storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('nothing is collapsed to begin with', () => {
    expect(loadCollapsed()).toEqual([])
  })

  test('loads back the ids that were saved', () => {
    saveCollapsed(['chores', 'social'])
    expect(loadCollapsed()).toEqual(['chores', 'social'])
  })
})

describe('templates and skipped chores', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('start empty', () => {
    expect(loadTemplates()).toEqual([])
    expect(loadSkipped()).toEqual([])
  })

  test('load back what was saved', () => {
    const cook = {
      id: 'cook',
      title: 'Cook dinner',
      categoryId: 'meals',
      repeat: 'daily',
      time: '18:00',
      durationMin: 60,
    }
    saveTemplates([cook])
    saveSkipped(['cook:2026-10-05'])

    expect(loadTemplates()).toEqual([cook])
    expect(loadSkipped()).toEqual(['cook:2026-10-05'])
  })

  test('the calendar record starts empty and loads back', () => {
    expect(loadSent()).toEqual({})

    saveSent({ t1: { eventId: 'event-1', signature: 'Laundry|...' } })
    expect(loadSent().t1.eventId).toBe('event-1')
  })

  test('a damaged calendar record becomes an empty one', () => {
    localStorage.setItem('dagen.calendar.v1', '["not", "an", "object"]')
    expect(loadSent()).toEqual({})
  })

  test('are kept apart from each other', () => {
    saveTemplates([{ id: 'cook' }])
    // Saving one list must not wipe another.
    expect(loadSkipped()).toEqual([])
    expect(loadCollapsed()).toEqual([])
  })
})
