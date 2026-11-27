/*
  undo.test.js — tests for src/lib/undo.js.
*/

import { describe, expect, test } from 'vitest'
import { putBack } from './undo.js'

describe('putBack', () => {
  const a = { id: 'a' }
  const b = { id: 'b' }
  const c = { id: 'c' }

  test('returns an item to where it was', () => {
    expect(putBack([a, c], b, 1)).toEqual([a, b, c])
  })

  test('at the end when the list got shorter meanwhile', () => {
    expect(putBack([a], c, 5)).toEqual([a, c])
  })

  test('never twice: the same list back if it is already there', () => {
    const list = [a, b]
    expect(putBack(list, b, 0)).toBe(list)
  })
})
