import { expect, test } from '@jest/globals'

import { query } from './query.js'

test('builds correct, unquoted sql query', () => {
  const builder = query()

  const { sql, bindings } = builder
    .select('column1')
    .select('column2')
    .from('scope.table_name')
    .where('column1', '=', 'value')
    .toSQL()

  expect(sql).toBe(
    'select column1, column2 from scope.table_name where column1 = ?'
  )

  expect(bindings).toEqual(['value'])
})
