import { test, expect } from '@jest/globals'

import { getLocation } from './get-location.js'

test('returns the expected query for valid parameters', () => {
  const locationId = 'L97339'

  const { sql } = getLocation(locationId)

  expect(sql).toMatchSnapshot()
})

test('uses optimized set operation and removes redundant table joins', () => {
  const { sql } = getLocation('L97339')

  expect(sql).toContain('UNION ALL')
  expect(sql).not.toContain('AHBRP.FEATURE,')
  expect(sql).not.toContain('AHBRP.COLL_REGSTRD_ANIMAL_GROUP')
})

test('throws if the parameters are invalid', () => {
  expect(() => getLocation(null)).toThrow(/invalid/i)
})
