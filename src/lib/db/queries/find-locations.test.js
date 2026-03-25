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

test('uses optimized set operation and removes redundant table joins', () => {
  const ids = ['L97339']
  const { sql } = findLocationsQuery(ids)

  expect(sql).toContain('UNION ALL')
  expect(sql).not.toContain('AHBRP.FEATURE,')
  expect(sql).not.toContain('AHBRP.COLL_REGSTRD_ANIMAL_GROUP')
})

test('throws when ids is empty', () => {
  expect(() => findLocationsQuery([])).toThrow('Invalid parameters')
})

test('throws when ids contain invalid characters', () => {
  expect(() => findLocationsQuery(["L97339' OR '1'='1"])).toThrow(
    'Invalid parameters'
  )
})
