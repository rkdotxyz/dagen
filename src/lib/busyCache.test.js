/*
  busyCache.test.js — tests for src/lib/busyCache.js, with a fake fetcher.
*/

import { describe, expect, test, vi } from 'vitest'
import { createBusyCache, uniqueEvents } from './busyCache.js'

describe('createBusyCache', () => {
  test('asks for a whole week, once per calendar and week', async () => {
    const fetchRange = vi.fn(async () => [{ id: 'e1' }])
    const cache = createBusyCache(fetchRange)

    await cache.week('kth', '2026-11-23')
    await cache.week('kth', '2026-11-23')
    await cache.week('kth', '2026-11-30')
    await cache.week('home', '2026-11-23')

    expect(fetchRange).toHaveBeenCalledTimes(3)
    expect(fetchRange).toHaveBeenCalledWith('kth', '2026-11-23', '2026-11-30')
  })

  test('clear() makes the next look fetch again', async () => {
    const fetchRange = vi.fn(async () => [])
    const cache = createBusyCache(fetchRange)

    await cache.week('kth', '2026-11-23')
    cache.clear()
    await cache.week('kth', '2026-11-23')

    expect(fetchRange).toHaveBeenCalledTimes(2)
  })

  test('a failure gives an empty week and is tried again next time', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchRange = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ id: 'e1' }])
    const cache = createBusyCache(fetchRange)

    expect(await cache.week('kth', '2026-11-23')).toEqual([])
    expect(await cache.week('kth', '2026-11-23')).toEqual([{ id: 'e1' }])

    reported.mockRestore()
  })
})

describe('uniqueEvents', () => {
  test('joins lists and drops repeats by id', () => {
    expect(uniqueEvents([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]]).map((e) => e.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
