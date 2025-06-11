import Hapi from '@hapi/hapi'
import { jest, test } from '@jest/globals'

import { config } from '../../../../config.js'
import { getTestContainer, getConnection } from '../../../../test/oracledb.js'

import * as route from './{holdingsId}.js'

const container = getTestContainer()

jest.setTimeout(60_000)

test('correctly returns the expected oracledb data', async () => {
  const samConfig = config.get('oracledb.sam')

  const server = Hapi.server({ port: 0 })

  server.decorate('server', 'oracledb.sam', () => {
    return getConnection(container, samConfig)
  })

  server.route({
    ...route,
    path: '/{countyId}/{parishId}/{holdingsId}',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/01/02/03'
  })

  console.log(res.result)
})
