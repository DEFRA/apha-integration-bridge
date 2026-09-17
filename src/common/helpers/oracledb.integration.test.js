import { afterAll, beforeAll, expect, test } from '@jest/globals'
import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'

import { config } from '../../config.js'
import { execute } from '../../lib/db/operations/execute.js'
import { oracleDb } from './oracledb.js'

/** @import { OracleDbHandle } from './oracledb-healthcheck.js' */

/** @type {import('@hapi/hapi').Server} */
let server

beforeAll(async () => {
  server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    },
    {
      plugin: oracleDb.plugin,
      options: {
        oracledbConfigurations: {
          sam: { ...config.get('oracledb').sam, poolMax: 1, callTimeout: 500 }
        }
      }
    }
  ])
})

afterAll(async () => {
  await server.stop()
})

test('a query that outlives callTimeout fails instead of hanging, and the pool recovers', async () => {
  const acquire = /** @type {() => Promise<OracleDbHandle>} */ (
    /** @type {any} */ (server)['oracledb.sam']
  )

  const db = await acquire()

  expect(db.connection.callTimeout).toBe(500)

  // thin mode reports NJS-123; thick mode reports the ORA-03156 that closed
  // the connection
  await expect(
    execute(db.connection, { sql: 'BEGIN DBMS_SESSION.SLEEP(3); END;' })
  ).rejects.toThrow(/NJS-123|ORA-03156/)

  // thick mode drops the connection after a timeout, so closing it can throw
  await db[Symbol.asyncDispose]().catch(() => {})

  await using again = await acquire()

  const rows = await execute(again.connection, {
    sql: 'SELECT 1 one FROM DUAL'
  })

  expect(rows).toEqual([{ one: 1 }])
})
