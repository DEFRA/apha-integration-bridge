import { expect, test } from '@jest/globals'

import { getWorkAreaCodeMappingQuery } from './get-workarea-code-mapping.js'

test('returns the expected query for a single work area code', () => {
  const { sql } = getWorkAreaCodeMappingQuery(['TB'])

  expect(sql).toMatchSnapshot()
})

test('returns the expected query for multiple work area codes', () => {
  const { sql } = getWorkAreaCodeMappingQuery(['TB', 'GI', 'MC'])

  expect(sql).toMatchSnapshot()
})
