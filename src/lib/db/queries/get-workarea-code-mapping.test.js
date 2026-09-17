import { expect, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { getWorkAreaCodeMappingQuery } from './get-workarea-code-mapping.js'

test('returns the expected query for a single work area code', () => {
  const { sql, bindings } = getWorkAreaCodeMappingQuery(['TB'])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 'TB' })
})

test('returns the expected query for multiple work area codes', () => {
  const { sql, bindings } = getWorkAreaCodeMappingQuery(['TB', 'GI', 'MC'])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 'TB', id1: 'GI', id2: 'MC' })
})

test('throws when work area codes is empty', () => {
  expect(() => getWorkAreaCodeMappingQuery([])).toThrow('Invalid parameters')
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = getWorkAreaCodeMappingQuery(['TB', 'GI'])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
