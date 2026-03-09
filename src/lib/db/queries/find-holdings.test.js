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

test('throws when ids is empty', () => {
  expect(() => findHoldingsQuery([])).toThrow('Invalid parameters')
})

test('throws when ids contain invalid characters', () => {
  expect(() => findHoldingsQuery(["11/111/1111' OR '1'='1"])).toThrow(
    'Invalid parameters'
  )
})
