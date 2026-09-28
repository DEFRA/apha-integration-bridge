import { describe, expect, jest, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import * as dbOperations from '../operations/execute.js'
import { findSuppliers, findSuppliersQuery } from './find-suppliers.js'

test('returns the expected query and bindings', () => {
  const { sql, bindings, pageSize } = findSuppliersQuery({
    type: 'OVPRACTICE',
    name: 'Smi',
    page: 2,
    pageSize: 10
  })

  expect(sql).toMatchSnapshot()
  expect(pageSize).toBe(10)
  expect(bindings).toEqual({
    roleType: 'OVPRACTICE',
    name: 'Smi',
    offsetRows: 10,
    fetchRows: 11
  })
})

test('binds a null name when none is supplied', () => {
  const { bindings } = findSuppliersQuery({ type: 'OVPRACTICE' })

  expect(bindings.name).toBeNull()
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findSuppliersQuery({ type: 'OVPRACTICE' })

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})

test('matches the name against person and organisation columns', () => {
  const { sql } = findSuppliersQuery({ type: 'OVPRACTICE', name: 'vet' })

  expect(sql).toContain(
    "UPPER(pe.person_given_name) LIKE '%' || UPPER(:name) || '%'"
  )
  expect(sql).toContain(
    "UPPER(pe.person_family_name) LIKE '%' || UPPER(:name) || '%'"
  )
  expect(sql).toContain(
    "UPPER(o.organisation_name) LIKE '%' || UPPER(:name) || '%'"
  )
})

test('rejects an unknown supplier type', () => {
  expect(() => findSuppliersQuery({ type: 'PLUMBER' })).toThrow(/invalid/i)
})

test.each(['Smi%', 'Smi_th', '%'])(
  'rejects the LIKE wildcard in name %p',
  (name) => {
    expect(() => findSuppliersQuery({ type: 'OVPRACTICE', name })).toThrow(
      /invalid/i
    )
  }
)

test('accepts digits and punctuation found in organisation names', () => {
  const { bindings } = findSuppliersQuery({
    type: 'OVPRACTICE',
    name: "Smith & Co. (Vets) Ltd 12646 O'Brien-Jones"
  })

  expect(bindings.name).toBe("Smith & Co. (Vets) Ltd 12646 O'Brien-Jones")
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
