import { describe, expect, test } from '@jest/globals'

import { asNullableDate, asNullableTimestamp } from './as-nullable-date.js'

// node-oracledb returns a stored DATE or TIMESTAMP as a Date at that
// wall-clock time in the process's time zone
const stored = new Date(2019, 3, 2, 13, 4, 5)

describe('asNullableTimestamp', () => {
  test('formats the stored wall-clock time as UTC', () => {
    expect(asNullableTimestamp(stored)).toBe('2019-04-02T13:04:05Z')
  })

  test.each([null, undefined, '2019-04-02', new Date(Number.NaN)])(
    'returns null for %p',
    (value) => {
      expect(asNullableTimestamp(value)).toBeNull()
    }
  )
})

describe('asNullableDate', () => {
  test('formats the stored date', () => {
    expect(asNullableDate(stored)).toBe('2019-04-02')
  })

  test('returns null for a missing date', () => {
    expect(asNullableDate(null)).toBeNull()
  })
})
