import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { getLocation } from './get-location.js'

test('returns the expected query for valid parameters', () => {
  const locationId = 'L97339'

  const { sql, bindings } = getLocation(locationId)

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ location: 'L97339' })
})

test('uses optimized set operation and removes redundant table joins', () => {
  const { sql } = getLocation('L97339')

  expect(sql).toContain('UNION ALL')
  expect(sql).not.toContain('AHBRP.FEATURE,')
})

test('throws if the parameters are invalid', () => {
  expect(() => getLocation(null)).toThrow(/invalid/i)
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = getLocation('L97339')

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
