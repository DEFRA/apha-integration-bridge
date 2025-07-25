import { test, expect } from '@jest/globals'

import { findHoldingQuery } from './find-holding.js'

test('returns the expected query for valid parameters', () => {
  const parameters = {
    countyId: '01',
    parishId: '000',
    holdingId: '0333'
  }

  const { sql, bindings } = findHoldingQuery(parameters)

  expect(sql).toMatchSnapshot()

  expect(bindings).toEqual(['01/000/0333'])
})

test('throws if the parameters are invalid', () => {
  expect(() => findHoldingQuery({})).toThrow(/required/i)
})
