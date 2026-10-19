import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findOrganisationAttributesQuery } from './find-organisation-attributes.js'

test('returns the expected query for valid parameters', () => {
  const { sql, bindings } = findOrganisationAttributesQuery([293001])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 293001 })
})

test('returns the expected query for multiple party keys', () => {
  const { sql, bindings } = findOrganisationAttributesQuery([293001, 293002])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 293001, id1: 293002 })
})

test('throws when the party keys are empty', () => {
  expect(() => findOrganisationAttributesQuery([])).toThrow(
    'Invalid parameters'
  )
})

test('throws when a party key is not a positive integer', () => {
  expect(() => findOrganisationAttributesQuery(['293001 OR 1=1'])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findOrganisationAttributesQuery([293001, 293002])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
