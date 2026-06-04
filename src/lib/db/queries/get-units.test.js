import { test, expect } from '@jest/globals'

import { getUnitsQuery } from './get-units.js'

test('returns the expected query for valid parameters', () => {
  const parameters = {
    countyId: '01',
    parishId: '022',
    holdingId: '0333'
  }

  const { sql, bindings } = getUnitsQuery(parameters)

  expect(sql).toMatchSnapshot()

  expect(bindings).toEqual(['01/022/0333'])
})

test('throws if the parameters are invalid', () => {
  // @ts-expect-error - missing required parameters
  expect(() => getUnitsQuery({})).toThrow(/required/i)
})

test('every marshaller key matches a selected column', () => {
  // Guards against typos like `oraganisation_name`: a marshaller registered
  // under a key that does not match a selected column is silently never
  // applied, so the field would leak in clear. Marshallers are looked up by
  // exact (lowercased) column name in operations/execute.js.
  const { sql, marshallers } = getUnitsQuery({
    countyId: '01',
    parishId: '022',
    holdingId: '0333'
  })

  const selectedColumns = new Set(
    sql
      .slice(sql.indexOf('select ') + 'select '.length, sql.indexOf(' from '))
      .split(',')
      .map((column) => column.trim().toLowerCase())
  )

  for (const key of Object.keys(marshallers ?? {})) {
    expect(selectedColumns.has(key.toLowerCase())).toBe(true)
  }
})
