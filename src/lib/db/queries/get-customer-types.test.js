import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import * as dbOperations from '../operations/execute.js'
import {
  getCustomerTypes,
  getCustomerTypesQuery
} from './get-customer-types.js'

describe('getCustomerTypesQuery', () => {
  test('returns the expected query for a single customer id', () => {
    const { sql, bindings } = getCustomerTypesQuery(['C123456'])

    expect(sql).toMatchSnapshot()
    expect(bindings).toEqual({ id0: 'C123456' })
  })

  test('returns the expected query for multiple customer ids', () => {
    const { sql, bindings } = getCustomerTypesQuery(['C123456', 'C234567'])

    expect(sql).toMatchSnapshot()
    expect(bindings).toEqual({ id0: 'C123456', id1: 'C234567' })
  })

  test('accepts organisation-style ids that do not start with C', () => {
    const { sql, bindings } = getCustomerTypesQuery(['O123456'])

    expect(sql).toContain('p.party_id IN (:id0)')
    expect(bindings).toEqual({ id0: 'O123456' })
  })

  test('accepts ids containing hyphens', () => {
    const { sql, bindings } = getCustomerTypesQuery(['C-123456'])

    expect(sql).toContain('p.party_id IN (:id0)')
    expect(bindings).toEqual({ id0: 'C-123456' })
  })

  test('retains subtype joins when resolving customer types', () => {
    const { sql } = getCustomerTypesQuery(['C123456'])

    expect(sql).toContain('JOIN ahbrp.person pe')
    expect(sql).toContain('JOIN ahbrp.organisation o')
  })

  test('throws when customer ids is empty', () => {
    expect(() => getCustomerTypesQuery([])).toThrow('Invalid parameters')
  })

  test('binds exactly the placeholders in its sql', () => {
    const { sql, bindings } = getCustomerTypesQuery(['C123456', 'C234567'])

    expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
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
