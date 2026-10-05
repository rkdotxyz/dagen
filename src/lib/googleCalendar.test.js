/*
  googleCalendar.test.js — the translation, and the requests, with a fake
  fetch. No network, no Google account, no tokens: just checking that the
  right shape goes to the right address.
*/

import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  createEvent,
  deleteEvent,
  toEvent,
  updateEvent,
} from './googleCalendar.js'

const chores = { id: 'chores', name: 'Chores', googleColorId: '2', hex: '#33b679' }

const laundry = {
  id: 't1',
  title: 'Laundry',
  categoryId: 'chores',
  start: '2026-10-05T14:00',
  durationMin: 90,
  tentative: false,
  status: 'todo',
}

// Replaces the browser's fetch with one that records the call and hands
// back whatever we tell it to.
function fakeFetch({ status = 200, body = {} } = {}) {
  const fake = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status: status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }))

  globalThis.fetch = fake
  return fake
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('toEvent', () => {
  test('a firm task', () => {
    expect(toEvent(laundry, chores, 'Europe/Stockholm')).toEqual({
      summary: 'Laundry',
      start: { dateTime: '2026-10-05T14:00:00', timeZone: 'Europe/Stockholm' },
      end: { dateTime: '2026-10-05T15:30:00', timeZone: 'Europe/Stockholm' },
      colorId: '2',
      transparency: 'opaque',
      extendedProperties: { private: { dagenTaskId: 't1' } },
    })
  })

  test('a tentative task is marked and shown as free', () => {
    const event = toEvent({ ...laundry, tentative: true }, chores, 'Europe/Stockholm')

    expect(event.summary).toBe('~ Laundry')
    expect(event.transparency).toBe('transparent')
  })

  test('a task running past midnight ends on the next day', () => {
    const late = { ...laundry, start: '2026-10-05T23:30', durationMin: 60 }
    const event = toEvent(late, chores, 'Europe/Stockholm')

    expect(event.end.dateTime).toBe('2026-10-06T00:30:00')
  })
})

describe('requests', () => {
  test('createEvent posts the event and returns the new id', async () => {
    const fetched = fakeFetch({ body: { id: 'event-1' } })

    expect(await createEvent('token-123', laundry, chores)).toBe('event-1')

    const [url, options] = fetched.mock.calls[0]
    expect(url).toContain('/calendars/primary/events')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer token-123')
    expect(JSON.parse(options.body).summary).toBe('Laundry')
  })

  test('updateEvent sends the whole event to that id', async () => {
    const fetched = fakeFetch({ body: { id: 'event-1' } })

    await updateEvent('token-123', 'event-1', laundry, chores)

    const [url, options] = fetched.mock.calls[0]
    expect(url).toContain('/events/event-1')
    expect(options.method).toBe('PUT')
  })

  test('deleteEvent accepts an event that is already gone', async () => {
    fakeFetch({ status: 410 })

    // No error: 410 means Google deleted it long ago, which is fine.
    await expect(deleteEvent('token-123', 'event-1')).resolves.toBeNull()
  })

  test('a real failure is reported, not swallowed', async () => {
    fakeFetch({ status: 403, body: { error: 'insufficient permissions' } })

    await expect(createEvent('token-123', laundry, chores)).rejects.toThrow(/403/)
  })
})
