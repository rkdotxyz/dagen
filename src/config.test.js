/*
  config.test.js — checks the category list itself.

  These tests don't check behaviour; they check that the data you edit by
  hand stays valid. When you swap in your own categories, a typo here
  turns a check red instead of quietly painting a section black.
*/

import { describe, expect, test } from 'vitest'
import { CATEGORIES, DEFAULT_CATEGORY_ID, getCategory } from './config.js'

describe('categories', () => {
  test('every id is unique', () => {
    const ids = CATEGORIES.map((category) => category.id)
    // A Set throws away duplicates, so if the sizes differ, there was one.
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every colour is a six-digit hex value', () => {
    for (const category of CATEGORIES) {
      // /^#[0-9a-f]{6}$/ means: a #, then exactly six characters 0-9 or a-f.
      expect(category.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  test('every Google colour id is one of the 11 Google allows', () => {
    for (const category of CATEGORIES) {
      const id = Number(category.googleColorId)
      expect(id).toBeGreaterThanOrEqual(1)
      expect(id).toBeLessThanOrEqual(11)
    }
  })

  test('the default category exists', () => {
    expect(getCategory(DEFAULT_CATEGORY_ID).id).toBe(DEFAULT_CATEGORY_ID)
  })

  test('an unknown id falls back to the default instead of crashing', () => {
    expect(getCategory('nonsense').id).toBe(DEFAULT_CATEGORY_ID)
  })
})
