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
})

test('joins county lookup to resolve county code to descriptive name', () => {
  const ids = ['L97339']
  const { sql } = findLocationsQuery(ids)

  expect(sql).toContain("RDS.REF_DATA_SET_NAME = 'COUNTY'")
  expect(sql).toContain('COUNTY_LOOKUP.SHORT_DESCRIPTION county')
  expect(sql).toContain('COUNTY_LOOKUP.CODE = BA.ADMINISTRATIVE_AREA')
  expect(sql).not.toContain('ADMINISTRATIVE_AREA county')
})

test('uses unit ids from livestock and facility tables rather than asset', () => {
  const ids = ['L97339']
  const { sql } = findLocationsQuery(ids)

  expect(sql).toContain(
    "CASE WHEN LU.UNIT_ID IS NULL THEN 'N/A' ELSE LU.UNIT_ID END unit_id"
  )
  expect(sql).toContain(
    "CASE WHEN FACILITY.UNIT_ID IS NULL THEN 'N/A' ELSE FACILITY.UNIT_ID END unit_id"
  )
  expect(sql).not.toContain('ASSET.UNIT_ID')
})

test('throws when ids is empty', () => {
  expect(() => findLocationsQuery([])).toThrow('Invalid parameters')
})

test('throws when ids contain invalid characters', () => {
  expect(() => findLocationsQuery(["L97339' OR '1'='1"])).toThrow(
    'Invalid parameters'
  )
})
