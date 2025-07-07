import { test, expect } from '@jest/globals'

import { getUnitsQuery } from './get-units.js'

test('returns the expected query for valid parameters', () => {
  const parameters = {
    countyId: '01',
    parishId: '022',
    holdingId: '0333'
  }

  const { sql, bindings } = getUnitsQuery(parameters)

  expect(sql).toMatchSnapshot()

  expect(bindings).toEqual(['01/022/0333'])
})

test('throws if the parameters are invalid', () => {
  // @ts-expect-error - missing required parameters
  expect(() => getUnitsQuery({})).toThrow(/required/i)
})
