/*
  migrate.test.js — tests for src/lib/migrate.js.

  Old saves must load with nothing lost, and newer saves must never be
  "helped" into something they weren't.
*/

import { describe, expect, test } from 'vitest'
import { DEFAULT_CATEGORY_ID } from '../config.js'
import { todayISO } from './dates.js'
import {
  DEFAULT_SETTINGS,
  migrateArea,
  migrateSettings,
  migrateTask,
  migrateTimer,
  onlyObjects,
} from './migrate.js'

describe('migrateTask', () => {
  test('keeps every field an old task had', () => {
    const old = {
      id: 'x',
      title: 'Dentist',
      categoryId: 'appointments',
      start: '2026-10-05T10:00',
      durationMin: 45,
      tentative: true,
      status: 'done',
      templateId: 'tpl',
    }
    expect(migrateTask(old)).toMatchObject(old)
  })

  test('keeps a value the task already has over the default', () => {
    const task = { id: 'x', start: null, day: null, rolled: 2, priority: true }
    expect(migrateTask(task)).toMatchObject({ rolled: 2, priority: true })
  })

  test('a pre-Phase 4 task with no time still gets 09:00 today, tentative', () => {
    const task = migrateTask({ id: 'old', title: 'Laundry', status: 'todo' })
    expect(task.start).toBe(`${todayISO()}T09:00`)
    expect(task.day).toBe(todayISO())
    expect(task.tentative).toBe(true)
    expect(task.categoryId).toBe(DEFAULT_CATEGORY_ID)
  })

  test('running it twice changes nothing more', () => {
    const once = migrateTask({ id: 'x', start: '2026-10-05T10:00', categoryId: 'chores' })
    expect(migrateTask(once)).toEqual(once)
  })
})

describe('migrateSettings', () => {
  test('nothing saved gives the defaults', () => {
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  test('keeps good values and replaces broken ones, one by one', () => {
    expect(
      migrateSettings({
        capacity: { weekday: 6, weekend: -1 },
        activeAreaLimit: 'five',
        rolloverEnabled: false,
      }),
    ).toEqual({
      capacity: { weekday: 6, weekend: 4 },
      activeAreaLimit: 5,
      rolloverEnabled: false,
    })
  })
})

describe('migrateArea', () => {
  test('fills in the missing fields', () => {
    expect(migrateArea({ id: 'a', name: 'Swedish', categoryId: 'learning' })).toMatchObject({
      status: 'active',
      monthlyBudgetHours: 0,
      archived: false,
    })
  })

  test('an Area in a category that no longer exists moves to the default', () => {
    expect(migrateArea({ id: 'a', name: 'X', categoryId: 'gone' }).categoryId).toBe(
      DEFAULT_CATEGORY_ID,
    )
  })
})

describe('the timer and saved lists', () => {
  test('a timer needs a start moment, or there is none', () => {
    const timer = { taskId: 't', label: 'Write', startedAt: '2026-11-27T12:02:11.000Z' }
    expect(migrateTimer(timer)).toEqual(timer)
    expect(migrateTimer({ label: 'no start' })).toBeNull()
    expect(migrateTimer(undefined)).toBeNull()
  })

  test('onlyObjects drops anything that is not an object', () => {
    expect(onlyObjects([{ id: 1 }, null, 'x', [], 3])).toEqual([{ id: 1 }])
    expect(onlyObjects('not a list')).toEqual([])
  })
})
