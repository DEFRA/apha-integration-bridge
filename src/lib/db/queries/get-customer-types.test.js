import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { execute } from '../operations/execute.js'
import {
  getCustomerTypes,
  getCustomerTypesQuery
} from './get-customer-types.js'

// Mock the execute operation so tests can force specific results.
// A `jest.spyOn(import * as dbOperations, 'execute')` does NOT reliably
// intercept the call made by get-customer-types.js: under babel's interop the
// spy targets the `import *` namespace object while the query module reads the
// raw module export, so the spy silently no-ops and the real DB is hit. A
// module-factory mock replaces the module for every importer. The default
// delegates to the real implementation so any real composition still works;
// individual tests override per call.
jest.mock('../operations/execute.js', () => {
  const actual = jest.requireActual('../operations/execute.js')
  return {
    __esModule: true,
    ...actual,
    execute: jest.fn((...args) => actual.execute(...args))
  }
})

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

    expect(sql).toContain("p.party_id IN ('O123456')")
  })

  test('accepts ids containing hyphens', () => {
    const { sql } = getCustomerTypesQuery(['C-123456'])

    expect(sql).toContain("p.party_id IN ('C-123456')")
  })

  test('retains subtype joins when resolving customer types', () => {
    const { sql } = getCustomerTypesQuery(['C123456'])

    expect(sql).toContain('JOIN ahbrp.person pe')
    expect(sql).toContain('JOIN ahbrp.organisation o')
  })

  test('throws when customer ids is empty', () => {
    expect(() => getCustomerTypesQuery([])).toThrow('Invalid parameters')
  })
})

describe('getCustomerTypes', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns a map of customer ids to customer types', async () => {
    jest.mocked(execute).mockResolvedValueOnce([
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
