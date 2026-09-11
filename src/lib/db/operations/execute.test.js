import { expect, jest, test } from '@jest/globals'
import OracleDB from 'oracledb'

import { execute } from './execute.js'

test('passes the sql and its bindings to the connection', async () => {
  const connection = {
    execute: jest.fn(async () => ({ rows: [{ one: 1 }] }))
  }

  const rows = await execute(/** @type {any} */ (connection), {
    sql: 'SELECT :a one FROM DUAL',
    bindings: { a: 1 }
  })

  expect(rows).toEqual([{ one: 1 }])

  expect(connection.execute).toHaveBeenCalledWith(
    'SELECT :a one FROM DUAL',
    { a: 1 },
    expect.objectContaining({ outFormat: OracleDB.OUT_FORMAT_OBJECT })
  )
})

test('binds nothing when the query has no bindings', async () => {
  const connection = {
    execute: jest.fn(async () => ({ rows: [] }))
  }

  await execute(/** @type {any} */ (connection), { sql: 'SELECT 1 FROM DUAL' })

  expect(connection.execute).toHaveBeenCalledWith(
    'SELECT 1 FROM DUAL',
    {},
    expect.anything()
  )
})
