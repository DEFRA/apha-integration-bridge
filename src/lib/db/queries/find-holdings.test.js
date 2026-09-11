import { test, expect } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { findHoldingsQuery } from './find-holdings.js'

test('returns the expected query for valid parameters', () => {
  const ids = ['11/111/1111']

  const { sql, bindings } = findHoldingsQuery(ids)

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: '11/111/1111' })
})

test('returns the expected query for multiple ids', () => {
  const ids = ['11/111/1111', '22/222/2222']

  const { sql, bindings } = findHoldingsQuery(ids)

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: '11/111/1111', id1: '22/222/2222' })
})

test('throws when ids is empty', () => {
  expect(() => findHoldingsQuery([])).toThrow('Invalid parameters')
})

test('throws when ids contain invalid characters', () => {
  expect(() => findHoldingsQuery(["11/111/1111' OR '1'='1"])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = findHoldingsQuery(['11/111/1111', '22/222/2222'])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
