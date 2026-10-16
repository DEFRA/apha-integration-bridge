import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findPartyRolesQuery } from './find-party-roles.js'

test('returns the expected query for valid parameters', () => {
  const { sql, bindings } = findPartyRolesQuery([91001])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 91001 })
})

test('returns the expected query for multiple party keys', () => {
  const { sql, bindings } = findPartyRolesQuery([91001, 91002])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 91001, id1: 91002 })
})

test('throws when the party keys are empty', () => {
  expect(() => findPartyRolesQuery([])).toThrow('Invalid parameters')
})

test('throws when a party key is not a positive integer', () => {
  expect(() => findPartyRolesQuery(['91001 OR 1=1'])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findPartyRolesQuery([91001, 91002])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
