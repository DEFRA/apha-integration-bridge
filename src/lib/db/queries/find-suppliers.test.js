import { describe, expect, jest, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import * as dbOperations from '../operations/execute.js'
import { findSuppliers, findSuppliersQuery } from './find-suppliers.js'

test('returns the expected query and bindings', () => {
  const { sql, bindings, pageSize } = findSuppliersQuery({
    type: 'OVPRACTICE',
    lastName: 'Smi',
    page: 2,
    pageSize: 10
  })

  expect(sql).toMatchSnapshot()
  expect(pageSize).toBe(10)
  expect(bindings).toEqual({
    roleType: 'OVPRACTICE',
    firstName: null,
    lastName: 'Smi',
    offsetRows: 10,
    fetchRows: 11
  })
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findSuppliersQuery({ type: 'OVPRACTICE' })

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})

test('rejects an unknown supplier type', () => {
  expect(() => findSuppliersQuery({ type: 'PLUMBER' })).toThrow(/invalid/i)
})

test('rejects LIKE wildcards in a name prefix', () => {
  expect(() =>
    findSuppliersQuery({ type: 'OVPRACTICE', lastName: 'Smi%' })
  ).toThrow(/invalid/i)
})

describe('findSuppliers', () => {
  const row = (n) => ({
    party_id: `P${n}`,
    party_type: 'PERSON',
    person_title: 'Dr',
    person_given_name: 'Sam',
    person_family_name: 'Smith',
    organisation_name: null
  })

  test('trims the sentinel row and reports a further page', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => row(i))

    jest.spyOn(dbOperations, 'execute').mockResolvedValue(rows)

    const result = await findSuppliers(/** @type {any} */ ({}), {
      type: 'OVPRACTICE',
      pageSize: 2
    })

    expect(result.hasMore).toBe(true)
    expect(result.suppliers).toHaveLength(2)
    expect(result.suppliers[0]).toEqual({
      id: 'P0',
      partyType: 'PERSON',
      title: 'Dr',
      firstName: 'Sam',
      lastName: 'Smith',
      organisationName: null
    })
  })

  test('reports no further page when the sentinel row is absent', async () => {
    jest.spyOn(dbOperations, 'execute').mockResolvedValue([row(0)])

    const result = await findSuppliers(/** @type {any} */ ({}), {
      type: 'OVPRACTICE',
      pageSize: 2
    })

    expect(result.hasMore).toBe(false)
    expect(result.suppliers).toHaveLength(1)
  })
})
