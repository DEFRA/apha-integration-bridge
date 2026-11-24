import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findPartyCphAssociationsQuery } from './find-party-cph-associations.js'

test('returns the expected query for valid parameters', () => {
  const { sql, bindings } = findPartyCphAssociationsQuery([318701])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 318701 })
})

test('throws when the party keys are empty', () => {
  expect(() => findPartyCphAssociationsQuery([])).toThrow('Invalid parameters')
})

test('throws when a party key is not a positive integer', () => {
  expect(() => findPartyCphAssociationsQuery(['318701 OR 1=1'])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findPartyCphAssociationsQuery([318701, 318702])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})

test('does not put the party keys in its sql', () => {
  const { sql } = findPartyCphAssociationsQuery([318701])

  expect(sql).not.toContain('318701')
  expect(sql).not.toContain('__PARTY_KEYS__')
})
