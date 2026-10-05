/*
  cloud.test.js — tests for the cloud helpers, with a FAKE database.

  None of this touches Supabase. The fake below records what it was
  asked to do and hands back whatever the test wants, which is enough to
  check the shapes we send and the way errors are handled.
*/

import { describe, expect, test, vi } from 'vitest'
import { fromPlanner, loadPlanner, savePlanner, toPlanner } from './cloud.js'

const planner = {
  tasks: [{ id: 't1', title: 'Laundry' }],
  templates: [{ id: 'c1', title: 'Cook dinner' }],
  skipped: ['c1:2026-10-05'],
  collapsed: ['social'],
}

// A stand-in for Supabase's client. Its methods return itself so calls
// can be chained the same way, and it remembers the last upsert.
function fakeClient({ row = null, error = null } = {}) {
  const calls = []

  const client = {
    calls: calls,
    from: () => client,
    select: () => client,
    eq: () => client,
    maybeSingle: async () => ({ data: row, error: error }),
    upsert: async (value) => {
      calls.push(value)
      return { error: error }
    },
  }

  return client
}

describe('planner shape', () => {
  test('keeps the four lists and nothing else', () => {
    const extra = { ...planner, somethingElse: 'should not travel' }
    expect(Object.keys(toPlanner(extra)).sort()).toEqual([
      'collapsed',
      'skipped',
      'tasks',
      'templates',
    ])
  })

  test('turns anything missing into an empty list', () => {
    expect(fromPlanner({ tasks: [{ id: 't1' }] })).toEqual({
      tasks: [{ id: 't1' }],
      templates: [],
      skipped: [],
      collapsed: [],
    })

    expect(fromPlanner(null)).toEqual({
      tasks: [],
      templates: [],
      skipped: [],
      collapsed: [],
    })
  })
})

describe('loadPlanner', () => {
  test('returns null when nothing is saved yet', async () => {
    expect(await loadPlanner(fakeClient(), 'user-1')).toBeNull()
  })

  test('returns the four lists when a row exists', async () => {
    const client = fakeClient({ row: { data: planner } })
    expect(await loadPlanner(client, 'user-1')).toEqual(planner)
  })

  test('returns null and reports a failure instead of throwing', async () => {
    // vi.spyOn replaces console.error for this test, so the failure
    // doesn't clutter the output and we can check it was reported.
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeClient({ error: { message: 'offline' } })

    expect(await loadPlanner(client, 'user-1')).toBeNull()
    expect(reported).toHaveBeenCalled()

    reported.mockRestore()
  })
})

describe('savePlanner', () => {
  test('sends the planner with the user id', async () => {
    const client = fakeClient()
    expect(await savePlanner(client, 'user-1', planner)).toBe(true)

    expect(client.calls[0].user_id).toBe('user-1')
    expect(client.calls[0].data).toEqual(planner)
  })

  test('reports a failure instead of throwing', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeClient({ error: { message: 'offline' } })

    expect(await savePlanner(client, 'user-1', planner)).toBe(false)
    expect(reported).toHaveBeenCalled()

    reported.mockRestore()
  })
})
