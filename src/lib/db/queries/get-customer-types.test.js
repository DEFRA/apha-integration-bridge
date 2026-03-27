import { afterEach, describe, expect, jest, test } from '@jest/globals'

import * as dbOperations from '../operations/execute.js'
import {
  getCustomerTypes,
  getCustomerTypesQuery
} from './get-customer-types.js'

describe('getCustomerTypesQuery', () => {
  test('returns the expected query for a single customer id', () => {
    const { sql } = getCustomerTypesQuery(['C123456'])

    expect(sql).toMatchSnapshot()
  })

  test('returns the expected query for multiple customer ids', () => {
    const { sql } = getCustomerTypesQuery(['C123456', 'C234567'])

    expect(sql).toMatchSnapshot()
  })

  test('accepts organisation-style ids that do not start with C', () => {
    const { sql } = getCustomerTypesQuery(['O123456'])

    expect(sql).toContain("party.party_id IN ('O123456')")
  })

  test('throws when customer ids is empty', () => {
    expect(() => getCustomerTypesQuery([])).toThrow('Invalid parameters')
  })
})

describe('getCustomerTypes', () => {
  const executeSpy = jest.spyOn(dbOperations, 'execute')

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('returns a map of customer ids to customer types', async () => {
    executeSpy.mockResolvedValue([
      { customer_id: 'C123456', customer_type: 'PERSON' },
      { customer_id: 'C234567', customer_type: 'ORGANISATION' }
    ])

    const result = await getCustomerTypes(/** @type {any} */ ({}), [
      'C123456',
      'C234567'
    ])

    expect(result).toBeInstanceOf(Map)
    expect(Array.from(result.entries())).toEqual([
      ['C123456', 'PERSON'],
      ['C234567', 'ORGANISATION']
    ])
  })
})
