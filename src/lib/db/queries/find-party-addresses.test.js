import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findPartyAddressesQuery } from './find-party-addresses.js'

test('returns the expected query for valid parameters', () => {
  const { sql, bindings } = findPartyAddressesQuery([298201])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 298201 })
})

test('returns the expected query for multiple party keys', () => {
  const { sql, bindings } = findPartyAddressesQuery([298201, 298205])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 298201, id1: 298205 })
})

test('throws when the party keys are empty', () => {
  expect(() => findPartyAddressesQuery([])).toThrow('Invalid parameters')
})

test('throws when a party key is not a positive integer', () => {
  expect(() => findPartyAddressesQuery(['298201 OR 1=1'])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findPartyAddressesQuery([298201, 298205])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
