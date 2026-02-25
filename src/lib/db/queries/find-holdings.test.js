import { test, expect } from '@jest/globals'

import { findHoldingsQuery } from './find-holdings.js'

test('returns the expected query for valid parameters', () => {
  const ids = ['11/111/1111']

  const { sql } = findHoldingsQuery(ids)

  expect(sql).toMatchSnapshot()
})

test('returns the expected query for multiple ids', () => {
  const ids = ['11/111/1111', '22/222/2222']

  const { sql } = findHoldingsQuery(ids)

  expect(sql).toMatchSnapshot()
})
