import { expect, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findCustomerIdsByEmailQuery } from './find-customer-ids-by-email.js'

test('returns the expected query', () => {
  const { sql } = findCustomerIdsByEmailQuery({ email: 'a@example.com' })

  expect(sql).toMatchSnapshot()
})

test('binds the e-mail address trimmed and upper case, and no filters', () => {
  const { bindings } = findCustomerIdsByEmailQuery({
    email: '  Shared.Search@Example.com '
  })

  expect(bindings).toEqual({
    email: 'SHARED.SEARCH@EXAMPLE.COM',
    surname: null,
    postcode: null
  })
})

test('binds the surname trimmed and upper case, and the postcode upper case without spaces', () => {
  const { bindings } = findCustomerIdsByEmailQuery({
    email: 'a@example.com',
    surname: " o'Neill ",
    postcode: ' ab1  2cd '
  })

  expect(bindings).toEqual({
    email: 'A@EXAMPLE.COM',
    surname: "O'NEILL",
    postcode: 'AB12CD'
  })
})

test('compares SAM values in a form a function-based index can serve', () => {
  const { sql } = findCustomerIdsByEmailQuery({ email: 'a@example.com' })

  expect(sql).toContain('UPPER(TRIM(TA.INTERNET_EMAIL_ADDRESS)) = :email')
  expect(sql).toContain('UPPER(TRIM(PE.PERSON_FAMILY_NAME)) = :surname')
  expect(sql).toContain("REPLACE(UPPER(BA.POSTCODE), ' ') = :postcode")
})

test('does not put the search values in the sql', () => {
  const { sql } = findCustomerIdsByEmailQuery({
    email: "x'OR'1'='1@example.com",
    surname: 'Farmer',
    postcode: 'AB1 2CD'
  })

  expect(sql).not.toMatch(/example\.com|farmer|ab1/i)
})

test('throws if the e-mail address is missing or blank', () => {
  expect(() =>
    // @ts-expect-error - explicitly testing missing required parameter
    findCustomerIdsByEmailQuery({})
  ).toThrow(/invalid/i)
  expect(() => findCustomerIdsByEmailQuery({ email: '  ' })).toThrow(/invalid/i)
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findCustomerIdsByEmailQuery({
    email: 'a@example.com'
  })

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
