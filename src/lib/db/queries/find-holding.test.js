import { test, expect } from '@jest/globals'

import { findHoldingQuery } from './find-holding.js'

test('returns the expected query for valid parameters', () => {
  const parameters = {
    cph: '01/000/0333'
  }

  const { sql } = findHoldingQuery(parameters)

  expect(sql).toMatchSnapshot()
})

test('throws if the parameters are invalid', () => {
  expect(() => findHoldingQuery({})).toThrow(/required/i)
})
