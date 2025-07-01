import Hapi from '@hapi/hapi'
import { jest, test, expect } from '@jest/globals'

import { config } from '../../../../config.js'
import { getTestContainer, getConnection } from '../../../../test/oracledb.js'

import * as route from './{holdingsId}.js'

const container = getTestContainer()

jest.setTimeout(90_000)

test('returns the cph and type for a CPH ID that exists', async () => {
  const samConfig = config.get('oracledb.sam')

  const server = Hapi.server({ port: 0 })

  server.decorate('server', 'oracledb.sam', () => {
    return getConnection(container, samConfig)
  })

  /**
   * create a fake simple auth strategy
   */
  // server.auth.scheme('simple', () => {
  //   return {
  //     authenticate: (request, h) => {
  //       return h.authenticated({ credentials: {} })
  //     }
  //   }
  // })

  // server.auth.strategy('simple', 'simple', {})

  // server.auth.default('simple')

  server.route({
    ...route,
    path: '/{countyId}/{parishId}/{holdingsId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/45/001/0002'
  })

  const response = /** @type {Record<string,unknown>} */ (res.result)

  expect(response).toMatchObject({
    data: {
      id: '45/001/0002',
      type: 'holdings',
      cphType: 'DEV_SAMPLE'
    }
  })

  expect(res.statusCode).toBe(200)
})

test('returns 404 for a CPH ID that does not exist', async () => {
  const samConfig = config.get('oracledb.sam')

  const server = Hapi.server({ port: 0 })

  server.decorate('server', 'oracledb.sam', () => {
    return getConnection(container, samConfig)
  })

  // /**
  //  * create a fake simple auth strategy
  //  */
  // server.auth.scheme('simple', () => {
  //   return {
  //     authenticate: (request, h) => {
  //       return h.authenticated({ credentials: {} })
  //     }
  //   }
  // })

  // server.auth.strategy('simple', 'simple', {})

  // server.auth.default('simple')

  server.route({
    ...route,
    path: '/{countyId}/{parishId}/{holdingsId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/00/00/0000'
  })

  expect(res.statusCode).toBe(404)
})
