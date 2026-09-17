import { expect, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import { getPurposeSpeciesCodeMappingQuery } from './get-purpose-species-code-mapping.js'

test('returns the expected query for a single species code', () => {
  const { sql, bindings } = getPurposeSpeciesCodeMappingQuery(['CTT'])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 'CTT' })
})

test('returns the expected query for multiple species codes', () => {
  const { sql, bindings } = getPurposeSpeciesCodeMappingQuery([
    'CTT',
    'Sheep',
    'Pigs'
  ])

  expect(sql).toMatchSnapshot()
  expect(bindings).toEqual({ id0: 'CTT', id1: 'Sheep', id2: 'Pigs' })
})

test('throws when species codes is empty', () => {
  expect(() => getPurposeSpeciesCodeMappingQuery([])).toThrow(
    'Invalid parameters'
  )
})

test('binds exactly the placeholders in its sql', () => {
  const { sql, bindings } = getPurposeSpeciesCodeMappingQuery(['CTT', 'Sheep'])

  expect(Object.keys(bindings).sort()).toEqual(placeholdersIn(sql))
})
