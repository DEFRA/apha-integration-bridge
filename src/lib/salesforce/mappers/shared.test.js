import { describe, expect, test } from '@jest/globals'

import {
  buildStreet,
  hasValue,
  normaliseDate,
  normaliseString,
  toBoolean,
  valueWithFlag
} from './shared.js'

describe('mapper shared utilities', () => {
  test('hasValue decodes boolean-like flags', () => {
    expect(hasValue({ field_hasvalue: true }, 'field')).toBe(true)
    expect(hasValue({ field_hasvalue: false }, 'field')).toBe(false)
    expect(hasValue({}, 'field')).toBeNull()
    expect(hasValue({ field_hasvalue: 'false' }, 'field')).toBe(false)
  })

  test('valueWithFlag respects flags and trims strings', () => {
    expect(
      valueWithFlag({ field: '  keep  ', field_hasvalue: true }, 'field', {
        allowMissingFlag: true
      })
    ).toBe('keep')
    expect(
      valueWithFlag({ field: 'present', field_hasvalue: false }, 'field')
    ).toBeUndefined()
    expect(
      valueWithFlag({ field: '', field_hasvalue: null }, 'field', {
        allowMissingFlag: true
      })
    ).toBeUndefined()
  })

  test('normaliseString collapses empty strings and preserves null', () => {
    expect(normaliseString(' value ')).toBe('value')
    expect(normaliseString('   ')).toBeUndefined()
    expect(normaliseString(null)).toBeNull()
  })

  test('normaliseDate returns YYYY-MM-DD for valid inputs and undefined otherwise', () => {
    expect(normaliseDate('2024-01-02T12:00:00Z')).toBe('2024-01-02')
    expect(normaliseDate('not-a-date')).toBeUndefined()
    expect(normaliseDate(null)).toBeNull()
  })

  test('toBoolean normalises string inputs and preserves null/undefined', () => {
    expect(toBoolean('true')).toBe(true)
    expect(toBoolean('false')).toBe(false)
    expect(toBoolean(null)).toBeNull()
    expect(toBoolean(undefined)).toBeUndefined()
  })

  test('buildStreet joins defined parts with newlines', () => {
    expect(buildStreet(['Line 1', undefined, 'Line 2'])).toBe('Line 1\nLine 2')
    expect(buildStreet([undefined, null])).toBeUndefined()
  })
})
