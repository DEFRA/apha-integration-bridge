import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findSupplierInvolvementsQuery } from './find-supplier-involvements.js'

test('returns the expected query for valid parameters', () => {
  const { sql, bindings } = findSupplierInvolvementsQuery([298210])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 298210 })
})

test('returns the expected query for multiple feature keys', () => {
  const { sql, bindings } = findSupplierInvolvementsQuery([298210, 298220])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 298210, id1: 298220 })
})

test('throws when the feature keys are empty', () => {
  expect(() => findSupplierInvolvementsQuery([])).toThrow('Invalid parameters')
})

test('throws when a feature key is not a positive integer', () => {
  expect(() => findSupplierInvolvementsQuery(['298210 OR 1=1'])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findSupplierInvolvementsQuery([298210, 298220])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
