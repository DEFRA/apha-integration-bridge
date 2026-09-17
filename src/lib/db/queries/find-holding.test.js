import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findHoldingQuery } from './find-holding.js'

test('returns the expected query for valid parameters', () => {
  const parameters = {
    cph: '01/000/0333'
  }

  const { sql, bindings } = findHoldingQuery(parameters)

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ cph: '01/000/0333' })
})

test('throws if the parameters are invalid', () => {
  expect(() => findHoldingQuery({})).toThrow(/required/i)
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findHoldingQuery({ cph: '01/000/0333' })

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
