import { test, expect } from '@jest/globals'

import { getUnitsQuery } from './get-units.js'

test('returns the expected query for valid parameters', () => {
  const parameters = {
    countyId: '01',
    parishId: '02',
    holdingsId: '03'
  }

  const { sql, bindings } = getUnitsQuery(parameters)

  expect(sql).toMatchSnapshot()

  expect(bindings).toEqual(['01/02/03'])
})

test('throws if the parameters are invalid', () => {
  // @ts-expect-error - missing required parameters
  expect(() => getUnitsQuery({})).toThrow(/required/i)
})
