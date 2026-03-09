import { test, expect } from '@jest/globals'

import { findWorkordersQuery } from './find-workorders.js'

test('returns the expected query for valid parameters', () => {
  const ids = ['WS-12345']

  const { sql } = findWorkordersQuery(ids)

  expect(sql).toMatchSnapshot()
})

test('returns the expected query for multiple ids', () => {
  const ids = ['WS-12345', 'WS-12346']

  const { sql } = findWorkordersQuery(ids)

  expect(sql).toMatchSnapshot()
})

test('throws when ids is empty', () => {
  expect(() => findWorkordersQuery([])).toThrow('Invalid parameters')
})

test('throws when ids contain invalid characters', () => {
  expect(() => findWorkordersQuery(["WS-12345' OR '1'='1"])).toThrow(
    'Invalid parameters'
  )
})
