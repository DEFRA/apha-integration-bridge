import { test, expect } from '@jest/globals'

import { findLocationsQuery } from './find-locations.js'

test('returns the expected query for valid parameters', () => {
  const ids = ['L97339']

  const { sql } = findLocationsQuery(ids)

  expect(sql).toMatchSnapshot()
})

test('returns the expected query for multiple ids', () => {
  const ids = ['L97339', 'L97340']

  const { sql } = findLocationsQuery(ids)

  expect(sql).toMatchSnapshot()
})

test('throws when ids is empty', () => {
  expect(() => findLocationsQuery([])).toThrow('Invalid parameters')
})
