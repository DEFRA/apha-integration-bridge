import Hapi from '@hapi/hapi'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import hapiPino from 'hapi-pino'
import fs from 'node:fs'
import path from 'node:path'

import route from './discovery.js'
import { registerSimpleAuthStrategy } from '../../../common/helpers/test-helpers/simple-auth.js'
import { HPAI_DISCOVERY_DATASET_KEYS } from '../../../lib/db/queries/hpai-discovery.js'

const routePath = '/alpha/hpai/discovery'

/**
 * Stand-ins for the oracledb and mongoDb plugins: one fake connection whose
 * `execute` answers each SQL text with `rowsFor(sql)` or throws, and a locker
 * that grants the lock unless `lockHeld` is set.
 *
 * @param {(sql: string) => Array<Record<string, unknown>>} rowsFor
 * @param {{ lockHeld?: boolean }} [options]
 */
async function createServer(rowsFor, { lockHeld = false } = {}) {
  const server = Hapi.server({ port: 0 })

  await server.register([{ plugin: hapiPino, options: { enabled: false } }])

  registerSimpleAuthStrategy(server)

  const connection = {
    callTimeout: 5000,
    execute: jest.fn(async (sql) => ({ rows: rowsFor(String(sql)) }))
  }

  const acquire = jest.fn(async () => ({
    connection,
    [Symbol.asyncDispose]: async () => {}
  }))

  server.decorate('server', 'oracledb.sam', acquire)

  const release = jest.fn(async () => true)

  const locker = {
    lock: jest.fn(async () =>
      lockHeld ? null : { [Symbol.asyncDispose]: release }
    )
  }

  server.decorate('server', 'locker', locker)

  server.route({ ...route, path: routePath, method: 'GET' })

  return { server, connection, acquire, locker, release }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('GET /alpha/hpai/discovery', () => {
  test('is registered while the flag is on, and requires authentication', () => {
    expect(route).not.toBeNull()
    expect(route.options.auth).toEqual({ mode: 'required' })
  })

  test('lists every dataset without touching the database', async () => {
    const { server, acquire } = await createServer(() => [])

    const response = await server.inject({ method: 'GET', url: routePath })

    expect(response.statusCode).toBe(200)

    const body = /** @type {any} */ (response.result)

    expect(body.data.map((item) => item.dataset)).toEqual(
      HPAI_DISCOVERY_DATASET_KEYS
    )
    expect(body.data[0]).toEqual({
      dataset: 'columns',
      kind: 'catalogue',
      description: expect.any(String),
      answers: expect.any(String)
    })
    expect(body.meta).toEqual({ datasets: HPAI_DISCOVERY_DATASET_KEYS.length })
    expect(acquire).not.toHaveBeenCalled()
  })

  test('returns 429 without connecting while another request holds the lock', async () => {
    const { server, acquire, locker } = await createServer(() => [], {
      lockHeld: true
    })

    const response = await server.inject({
      method: 'GET',
      url: `${routePath}?dataset=columns`
    })

    expect(response.statusCode).toBe(429)
    expect(response.result).toEqual(
      expect.objectContaining({ code: 'TOO_MANY_REQUESTS' })
    )
    expect(locker.lock).toHaveBeenCalledWith('alpha-hpai-discovery')
    expect(acquire).not.toHaveBeenCalled()
  })

  test('runs the requested datasets in order and returns their rows', async () => {
    const { server, connection } = await createServer((sql) =>
      sql.includes('all_tab_columns')
        ? [{ table_name: 'FEATURE', column_name: 'FEATURE_PK' }]
        : [{ feature_type: 'PREMISES', subtype: 'LOCATION', features: 3 }]
    )

    const url = `${routePath}?dataset=columns,feature-types`
    const response = await server.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(200)

    const body = /** @type {any} */ (response.result)

    expect(body.data.map((item) => [item.dataset, item.rowCount])).toEqual([
      ['columns', 1],
      ['feature-types', 1]
    ])
    expect(body.data[1].rows).toEqual([
      { feature_type: 'PREMISES', subtype: 'LOCATION', features: 3 }
    ])
    expect(body.meta).toEqual(
      expect.objectContaining({
        datasets: 2,
        perDatasetTimeoutMs: 20_000,
        budgetMs: 40_000
      })
    )
    expect(body.links).toEqual({ self: url })
    expect(connection.execute).toHaveBeenCalledTimes(2)
  })

  test('releases the lock after the run, and after a failure', async () => {
    const { server, acquire, release } = await createServer(() => [])

    await server.inject({ method: 'GET', url: `${routePath}?dataset=columns` })

    expect(release).toHaveBeenCalledTimes(1)

    acquire.mockRejectedValueOnce(new Error('pool exhausted'))

    await server.inject({ method: 'GET', url: `${routePath}?dataset=columns` })

    expect(release).toHaveBeenCalledTimes(2)
  })

  test('reports a failing dataset with its Oracle code and keeps going', async () => {
    const { server } = await createServer((sql) => {
      if (sql.includes('ahbrp.role r')) {
        throw Object.assign(
          new Error('ORA-00942: table or view does not exist\nHelp: ...'),
          { code: 'ORA-00942' }
        )
      }

      return [{ ok: 1 }]
    })

    const response = await server.inject({
      method: 'GET',
      url: `${routePath}?dataset=role-types&dataset=columns`
    })

    expect(response.statusCode).toBe(200)

    const body = /** @type {any} */ (response.result)

    expect(body.data[0].error).toEqual({
      code: 'ORA-00942',
      message: 'ORA-00942: table or view does not exist'
    })
    expect(body.data[1].error).toBeNull()
  })

  test('rejects an unknown dataset with 400 before connecting', async () => {
    const { server, acquire } = await createServer(() => [])

    const response = await server.inject({
      method: 'GET',
      url: `${routePath}?dataset=columns,party_names`
    })

    expect(response.statusCode).toBe(400)
    expect(JSON.stringify(response.result)).toContain('party_names')
    expect(acquire).not.toHaveBeenCalled()
  })

  test('returns 500 when no connection can be acquired', async () => {
    const { server, acquire } = await createServer(() => [])

    acquire.mockRejectedValueOnce(new Error('pool exhausted'))

    const response = await server.inject({
      method: 'GET',
      url: `${routePath}?dataset=columns`
    })

    expect(response.statusCode).toBe(500)
  })

  test('documents every dataset', () => {
    const notes = fs.readFileSync(
      path.join(
        decodeURIComponent(new URL('.', import.meta.url).pathname),
        'discovery.md'
      ),
      'utf8'
    )

    for (const key of HPAI_DISCOVERY_DATASET_KEYS) {
      expect(notes).toContain(`\`${key}\``)
    }
  })
})
