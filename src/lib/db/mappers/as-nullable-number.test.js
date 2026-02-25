import { expect, test } from '@jest/globals'

import { asNullableNumber } from './as-nullable-number.js'

test('asNullableNumber coerces values to nullable numbers', () => {
  expect(asNullableNumber(null)).toBeNull()
  expect(asNullableNumber('')).toBeNull()
  expect(asNullableNumber('abc')).toBeNull()
  expect(asNullableNumber('12')).toBe(12)
  expect(asNullableNumber(5)).toBe(5)
})
