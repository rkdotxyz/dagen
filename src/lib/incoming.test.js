import { describe, expect, test } from 'vitest'
import { signatureOf } from './calendarSync.js'
import { applyIncoming, changesFrom, readSummary, taskIdOf } from './incoming.js'

const laundry = {
  id: 't1',
  title: 'Laundry',
  categoryId: 'chores',
  start: '2026-10-05T14:00',
  durationMin: 90,
  tentative: false,
  status: 'todo',
}

const sent = { t1: { eventId: 'event-1', signature: signatureOf(laundry) } }

// An event as Google hands it back.
function event(changes = {}) {
  return {
    id: 'event-1',
    status: 'confirmed',
    summary: 'Laundry',
    start: { dateTime: '2026-10-05T14:00:00+02:00' },
    end: { dateTime: '2026-10-05T15:30:00+02:00' },
    extendedProperties: { private: { dagenTaskId: 't1' } },
    ...changes,
  }
}

describe('reading an event', () => {
  test('finds the hidden task id, or says there is none', () => {
    expect(taskIdOf(event())).toBe('t1')
    expect(taskIdOf({ summary: 'Lecture' })).toBeNull()
  })

  test('a tilde in the title means tentative', () => {
    expect(readSummary('~ Laundry')).toEqual({ title: 'Laundry', tentative: true })
    expect(readSummary('Laundry')).toEqual({ title: 'Laundry', tentative: false })
  })

  test('turns an event into the fields a task keeps', () => {
    expect(changesFrom(event())).toEqual({
      title: 'Laundry',
      tentative: false,
      start: '2026-10-05T14:00',
      durationMin: 90,
    })
  })

  test('reads a dragged and resized event', () => {
    const moved = event({
      start: { dateTime: '2026-10-05T16:00:00+02:00' },
      end: { dateTime: '2026-10-05T16:30:00+02:00' },
    })

    expect(changesFrom(moved)).toMatchObject({
      start: '2026-10-05T16:00',
      durationMin: 30,
    })
  })
})

describe('applyIncoming', () => {
  test('a moved event moves the task', () => {
    const moved = event({
      start: { dateTime: '2026-10-05T16:00:00+02:00' },
      end: { dateTime: '2026-10-05T17:30:00+02:00' },
    })

    const result = applyIncoming([moved], [laundry], sent, signatureOf)

    expect(result.tasks[0].start).toBe('2026-10-05T16:00')
    expect(result.applied).toBe(1)
    // The record is updated too, or the next outgoing round would push
    // the old time straight back.
    expect(result.sent.t1.signature).toBe(signatureOf(result.tasks[0]))
  })

  test('removing the tilde confirms a tentative task', () => {
    const maybe = { ...laundry, tentative: true }
    const result = applyIncoming([event()], [maybe], sent, signatureOf)

    expect(result.tasks[0].tentative).toBe(false)
  })

  test('a cancelled event deletes the task', () => {
    const result = applyIncoming([event({ status: 'cancelled' })], [laundry], sent, signatureOf)

    expect(result.tasks).toEqual([])
    expect(result.sent.t1).toBeUndefined()
  })

  test('an event with no Dagen id is ignored', () => {
    const lecture = { id: 'x', summary: 'Föreläsning', start: {}, end: {} }
    const result = applyIncoming([lecture], [laundry], sent, signatureOf)

    expect(result.applied).toBe(0)
    expect(result.tasks).toEqual([laundry])
  })

  test('an unchanged event changes nothing', () => {
    expect(applyIncoming([event()], [laundry], sent, signatureOf).applied).toBe(0)
  })

  test('an event for a task this device no longer has is ignored', () => {
    expect(applyIncoming([event()], [], sent, signatureOf).applied).toBe(0)
  })

  test('an all-day version of our event is left alone', () => {
    const allDay = event({ start: { date: '2026-10-05' }, end: { date: '2026-10-06' } })

    expect(applyIncoming([allDay], [laundry], sent, signatureOf).applied).toBe(0)
  })
})
