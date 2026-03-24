import { expect, test } from '@jest/globals'

import { getPurposeSpeciesCodeMappingQuery } from './get-purpose-species-code-mapping.js'

test('returns the expected query for a single species code', () => {
  const { sql } = getPurposeSpeciesCodeMappingQuery(['CTT'])

  expect(sql).toMatchSnapshot()
})

test('returns the expected query for multiple species codes', () => {
  const { sql } = getPurposeSpeciesCodeMappingQuery(['CTT', 'Sheep', 'Pigs'])

  expect(sql).toMatchSnapshot()
})

test('throws when species codes is empty', () => {
  expect(() => getPurposeSpeciesCodeMappingQuery([])).toThrow(
    'Invalid parameters'
  )
})
