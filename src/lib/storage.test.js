/*
  storage.test.js — tests for src/lib/storage.js.

  Unit tests: they check one small piece on its own, with no screens drawn.
*/

import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_CATEGORY_ID } from '../config.js'
import { todayISO } from './dates.js'
import { DEFAULT_SETTINGS, migrateArea } from './migrate.js'
import {
  loadAreas,
  loadAway,
  loadEntries,
  loadSettings,
  loadTimer,
  saveAreas,
  saveAway,
  saveEntries,
  saveSettings,
  saveTimer,
  loadCollapsed,
  loadSkipped,
  loadTasks,
  loadTemplates,
  saveCollapsed,
  loadBusyCalendars,
  loadSent,
  loadSyncedAt,
  saveBusyCalendars,
  saveSent,
  saveSyncedAt,
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

  // Changed in Phase 11 (on purpose): a task loads back with its new
  // fields filled in, so "exactly the same" became "everything kept".
  test('loads back everything that was saved', () => {
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
    const loaded = loadTasks()

    expect(loaded[0]).toMatchObject(tasks[0])
    expect(loaded[1]).toMatchObject(tasks[1])
  })

  test('a Phase 10 task gets the Phase 11 fields, with its day from start', () => {
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

    expect(loadTasks()[0]).toEqual({
      id: 'x',
      title: 'Dentist',
      categoryId: 'appointments',
      start: '2026-10-05T10:00',
      day: '2026-10-05',
      durationMin: 45,
      tentative: false,
      status: 'todo',
      areaId: null,
      fixed: false,
      due: null,
      priority: false,
      rolled: 0,
      doneAt: null,
    })
  })

  test('a task saved with no day stays unplaced after a reload', () => {
    // Unlike a pre-Phase 4 task, this one HAS a day field (null), so it
    // was unplaced on purpose and must not be given a 09:00 slot.
    saveTasks([
      { id: 'cv', title: 'Update CV', categoryId: 'personal', start: null, day: null },
    ])

    expect(loadTasks()[0]).toMatchObject({ start: null, day: null })
  })

  test('a task placed any time on a day keeps its day', () => {
    saveTasks([{ id: 'r', title: 'Read', start: null, day: '2026-11-27' }])
    expect(loadTasks()[0]).toMatchObject({ start: null, day: '2026-11-27' })
  })

  test('skips damaged entries in the list instead of crashing', () => {
    localStorage.setItem('dagen.tasks.v1', JSON.stringify([null, 'x', { id: 'ok' }]))
    expect(loadTasks().map((task) => task.id)).toEqual(['ok'])
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

  test('remembers when it last asked Google', () => {
    expect(loadSyncedAt()).toBeNull()

    saveSyncedAt('2026-10-05T10:00:00.000Z')
    expect(loadSyncedAt()).toBe('2026-10-05T10:00:00.000Z')
  })

  test('remembers which calendars count as busy', () => {
    expect(loadBusyCalendars()).toEqual([])

    saveBusyCalendars(['primary', 'ht26'])
    expect(loadBusyCalendars()).toEqual(['primary', 'ht26'])
  })

  test('are kept apart from each other', () => {
    saveTemplates([{ id: 'cook' }])
    // Saving one list must not wipe another.
    expect(loadSkipped()).toEqual([])
    expect(loadCollapsed()).toEqual([])
  })
})

describe('Phase 11: Areas, time and settings in storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('everything starts empty, with default settings', () => {
    expect(loadAreas()).toEqual([])
    expect(loadEntries()).toEqual([])
    expect(loadAway()).toEqual([])
    expect(loadTimer()).toBeNull()
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  test('loads back what was saved', () => {
    const area = migrateArea({ id: 'a_rk', name: 'Räckvidd', categoryId: 'projects' })
    const entry = { id: 'e1', areaId: 'a_rk', start: '2026-11-27T13:02', end: '2026-11-27T14:40' }
    const timer = { taskId: null, areaId: 'a_rk', label: 'Räckvidd', startedAt: '2026-11-27T12:02:11.000Z' }
    const block = { id: 'w', title: 'Winter trip', startDay: '2026-12-18', endDay: '2027-01-05' }
    const settings = { ...DEFAULT_SETTINGS, activeAreaLimit: 4 }

    saveAreas([area])
    saveEntries([entry])
    saveTimer(timer)
    saveAway([block])
    saveSettings(settings)

    expect(loadAreas()).toEqual([area])
    expect(loadEntries()).toEqual([entry])
    expect(loadTimer()).toEqual(timer)
    expect(loadAway()).toEqual([block])
    expect(loadSettings()).toEqual(settings)
  })

  test('a stopped timer is saved as nothing', () => {
    saveTimer({ label: 'x', startedAt: '2026-11-27T12:00:00.000Z' })
    saveTimer(null)
    expect(loadTimer()).toBeNull()
  })

  test('damaged settings come back as the defaults', () => {
    localStorage.setItem('dagen.settings.v1', '{broken')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
