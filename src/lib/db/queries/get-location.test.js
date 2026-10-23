import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findLocationsQuery } from './find-locations.js'
import { getLocation } from './get-location.js'

test('runs find-locations.sql for the one location', () => {
  expect(getLocation('L97339')).toEqual(findLocationsQuery(['L97339']))
})

test('throws if the parameters are invalid', () => {
  expect(() => getLocation(null)).toThrow(/invalid/i)
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = getLocation('L97339')

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
