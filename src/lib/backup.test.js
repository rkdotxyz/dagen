/*
  backup.test.js — tests for src/lib/backup.js.
*/

import { describe, expect, test } from 'vitest'
import { describePlanner, exportPlanner, parseImport } from './backup.js'
import { DEFAULT_SETTINGS } from './migrate.js'

const state = {
  tasks: [{ id: 't1', title: 'Laundry', start: '2026-11-27T10:00', categoryId: 'chores' }],
  templates: [],
  skipped: [],
  collapsed: [],
  areas: [{ id: 'a1', name: 'Räckvidd', categoryId: 'projects' }],
  entries: [],
  activeTimer: null,
  away: [],
  settings: DEFAULT_SETTINGS,
}

describe('export and import', () => {
  test('an export reads back with nothing lost', () => {
    const text = exportPlanner(state, new Date('2026-11-28T10:00:00Z'))
    const data = JSON.parse(text)
    expect(data).toMatchObject({ app: 'dagen', version: 3, exportedAt: '2026-11-28T10:00:00.000Z' })

    const { planner, error } = parseImport(text)
    expect(error).toBeUndefined()
    expect(planner.tasks[0]).toMatchObject(state.tasks[0])
    expect(planner.areas[0]).toMatchObject(state.areas[0])
    expect(planner.settings).toEqual(DEFAULT_SETTINGS)
  })

  test('a bare planner, without the label, is accepted too', () => {
    expect(parseImport(JSON.stringify({ tasks: [] })).planner.tasks).toEqual([])
  })

  test('says what is wrong instead of replacing anything', () => {
    expect(parseImport('  ').error).toBe('Paste an export first.')
    expect(parseImport('{ not json').error).toBe('That isn’t valid JSON. Paste the whole export, from { to }.')
    expect(parseImport('[1, 2]').error).toBe('This doesn’t look like a Dagen export.')
    expect(parseImport('{"hello": "world"}').error).toBe('This doesn’t look like a Dagen export.')
  })

  test('describes what an import brings', () => {
    const { planner } = parseImport(exportPlanner(state))
    expect(describePlanner(planner)).toBe('1 task, 1 Area, 0 time entries')
  })
})
