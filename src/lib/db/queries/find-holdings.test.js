import { test, expect } from '@jest/globals'

import { findHoldingsQuery } from './find-holdings.js'

test('returns the expected query for valid parameters', () => {
  const ids = ['01/000/0333']

  const { sql } = findHoldingsQuery(ids)

  expect(sql).toMatchSnapshot()
})
