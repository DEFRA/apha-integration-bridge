import { expect, test } from '@jest/globals'

import { asNullableString } from './as-nullable-string.js'

test('asNullableString coerces values to nullable trimmed strings', () => {
  expect(asNullableString(null)).toBeNull()
  expect(asNullableString(undefined)).toBeNull()
  expect(asNullableString('   ')).toBeNull()
  expect(asNullableString('  value  ')).toBe('value')
})
