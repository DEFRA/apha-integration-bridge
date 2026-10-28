import { expect, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findCustomersQuery } from './find-customers.js'

test('returns the expected query for valid ids', () => {
  const ids = ['C123456', 'C234567']

  const { sql, bindings } = findCustomersQuery(ids, 'PERSON')

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({
    id0: 'C123456',
    id1: 'C234567',
    customerType: 'PERSON'
  })
})

test('throws if the parameters are invalid', () => {
  expect(() => findCustomersQuery([], 'PERSON')).toThrow(/invalid/i)
})

test('throws when ids contain invalid characters', () => {
  expect(() => findCustomersQuery(["C123456' OR '1'='1"], 'PERSON')).toThrow(
    /invalid/i
  )
})

test('joins county lookup to resolve county code to descriptive name, keeping a value that is not a code', () => {
  const { sql } = findCustomersQuery(['C123456'], 'PERSON')

  expect(sql).toContain("RDS.REF_DATA_SET_NAME = 'COUNTY'")
  expect(sql).toContain(
    'COALESCE(county_lookup.short_description, ba.administrative_area) county'
  )
  expect(sql).toContain('county_lookup.code = ba.administrative_area')
})

test('does not join telecom contacts', () => {
  const { sql } = findCustomersQuery(['C123456'], 'PERSON')

  expect(sql).not.toMatch(/telecom_address/i)
  expect(sql).not.toMatch(/telecom_contacts/i)
})

test('throws if customerType is missing', () => {
  expect(() =>
    // @ts-expect-error - explicitly testing missing required parameter
    findCustomersQuery(['C123456'])
  ).toThrow(/customertype/i)
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findCustomersQuery(['C123456', 'C234567'], 'PERSON')

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
