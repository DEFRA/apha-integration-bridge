import { test, expect } from '@jest/globals'

import { getLocation } from './get-location.js'

test('returns the expected query for valid parameters', () => {
  const locationId = 'L97339'

  const { sql, bindings } = getLocation(locationId)

  expect(sql).toMatchSnapshot()

  expect(bindings).toEqual({
    location: locationId
  })
})

test('throws if the parameters are invalid', () => {
  expect(() => getLocation(null)).toThrow(/invalid/i)
})
