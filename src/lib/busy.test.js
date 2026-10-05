import { describe, expect, test } from 'vitest'
import { toBusyBlocks } from './busy.js'

const lecture = {
  id: 'lec-1',
  status: 'confirmed',
  summary: 'Föreläsning DM2713',
  start: { dateTime: '2026-10-05T10:00:00+02:00' },
  end: { dateTime: '2026-10-05T12:00:00+02:00' },
}

describe('toBusyBlocks', () => {
  test('a lecture becomes something the overlap rule understands', () => {
    expect(toBusyBlocks([lecture])).toEqual([
      {
        id: 'busy:lec-1',
        title: 'Föreläsning DM2713',
        start: '2026-10-05T10:00',
        durationMin: 120,
        status: 'todo',
        external: true,
      },
    ])
  })

  test("skips Dagen's own events", () => {
    const ours = {
      ...lecture,
      extendedProperties: { private: { dagenTaskId: 't1' } },
    }

    expect(toBusyBlocks([ours])).toEqual([])
  })

  test('skips all-day events like holidays', () => {
    const holiday = {
      id: 'h1',
      summary: 'Mahatma Gandhi Jayanti',
      start: { date: '2026-10-02' },
      end: { date: '2026-10-03' },
    }

    expect(toBusyBlocks([holiday])).toEqual([])
  })

  test('skips anything marked free', () => {
    expect(toBusyBlocks([{ ...lecture, transparency: 'transparent' }])).toEqual([])
  })

  test('skips cancelled events', () => {
    expect(toBusyBlocks([{ ...lecture, status: 'cancelled' }])).toEqual([])
  })

  test('copes with an event that has no title', () => {
    expect(toBusyBlocks([{ ...lecture, summary: undefined }])[0].title).toBe('Busy')
  })
})
