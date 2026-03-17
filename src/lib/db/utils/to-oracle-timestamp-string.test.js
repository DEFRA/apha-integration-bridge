import { expect, test } from '@jest/globals'

import { toOracleTimestampString } from './to-oracle-timestamp-string.js'

test('formats a UTC date into Oracle timestamp string with milliseconds', () => {
  const date = new Date('2024-01-15T14:30:00.123Z')

  expect(toOracleTimestampString(date)).toBe('2024-01-15 14:30:00.123')
})

test('pads all date and time components to required widths', () => {
  const date = new Date('2024-01-05T04:03:02.009Z')

  expect(toOracleTimestampString(date)).toBe('2024-01-05 04:03:02.009')
})

test('throws a TypeError when the input is not a Date object', () => {
  expect(() =>
    toOracleTimestampString(/** @type {any} */ ('2024-01-15T14:30:00.123Z'))
  ).toThrow(new TypeError('Invalid Date object'))
})

test('throws a TypeError when the input is an invalid Date object', () => {
  const invalidDate = new Date('invalid-date-value')

  expect(() => toOracleTimestampString(invalidDate)).toThrow(
    new TypeError('Invalid Date object')
  )
})
