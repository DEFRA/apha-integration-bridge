import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { test, expect, jest } from '@jest/globals'
import { oracleDb } from '../../../../common/helpers/oracledb.js'

import * as route from './{holdingId}.js'

test('returns the cph and type for a CPH ID that exists', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    },
    oracleDb
  ])

  /**
   * create a fake simple auth strategy
   */
  server.auth.scheme('simple', () => {
    return {
      authenticate: (_request, h) => {
        return h.authenticated({ credentials: {} })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{countyId}/{parishId}/{holdingId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/04/432/1234'
  })

  const response = /** @type {Record<string,unknown>} */ (res.result)

  expect(response).toMatchObject({
    data: {
      id: '04/432/1234',
      type: 'holdings',
      cphType: 'HOLDER_TEST',
      relationships: {
        location: {
          data: {
            type: 'locations',
            id: 'LOC-GAMMA'
          }
        },
        cphHolder: {
          data: {
            type: 'customers',
            id: 'CUST-044321234'
          }
        }
      }
    },
    links: {
      self: '/04/432/1234'
    }
  })

  expect(res.statusCode).toBe(200)
})

test('returns 404 for a CPH ID that does not exist', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    },
    oracleDb
  ])

  /**
   * create a fake simple auth strategy
   */
  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => {
        return h.authenticated({ credentials: {} })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{countyId}/{parishId}/{holdingId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/00/000/0000'
  })

  expect(res.statusCode).toBe(404)
})

test('returns a 409 conflict error when a CPH ID has multiple locations', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    },
    oracleDb
  ])

  /**
   * create a fake simple auth strategy
   */
  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => {
        return h.authenticated({ credentials: {} })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{countyId}/{parishId}/{holdingId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/01/409/1111'
  })

  const response = /** @type {Record<string,unknown>} */ (res.result)

  expect(response).toMatchObject({
    message:
      'Duplicate Location resources found associated with given CPH number.',
    code: 'DUPLICATE_RESOURCES_FOUND',
    errors: []
  })

  expect(res.statusCode).toBe(409)
})

test('returns the error envelope and logs when the database is unavailable', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register({
    plugin: hapiPino,
    options: {
      enabled: false
    }
  })

  // Stand-in for the oracledb plugin's decoration: the connection request
  // rejects, driving the handler's catch block.
  server.decorate('server', 'oracledb.sam', () =>
    Promise.reject(new Error('connection refused'))
  )

  // Spy on request.logger.error to prove the catch block logs
  // unconditionally now that the logger guard is gone.
  const errorSpy = jest.fn()

  server.ext('onPreHandler', (request, h) => {
    request.logger = /** @type {any} */ ({
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: errorSpy
    })
    return h.continue
  })

  server.auth.scheme('simple', () => {
    return {
      authenticate: (_request, h) => h.authenticated({ credentials: {} })
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{countyId}/{parishId}/{holdingId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/04/432/1234'
  })

  expect(res.statusCode).toBe(500)
  expect(res.result).toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    errors: [
      {
        code: 'DATABASE_ERROR'
      }
    ]
  })
  expect(errorSpy).toHaveBeenCalled()
})
