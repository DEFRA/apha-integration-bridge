import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findPartyContactsQuery } from './find-party-contacts.js'

test('returns the expected query for valid parameters', () => {
  const { sql, bindings } = findPartyContactsQuery([292901])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 292901 })
})

test('returns the expected query for multiple party keys', () => {
  const { sql, bindings } = findPartyContactsQuery([292901, 292902])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 292901, id1: 292902 })
})

test('throws when the party keys are empty', () => {
  expect(() => findPartyContactsQuery([])).toThrow('Invalid parameters')
})

test('throws when a party key is not a positive integer', () => {
  expect(() => findPartyContactsQuery(['292901 OR 1=1'])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findPartyContactsQuery([292901, 292902])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
