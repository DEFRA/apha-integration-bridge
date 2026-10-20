import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, expect, test } from '@jest/globals'

import { oracleDb } from '../../common/helpers/oracledb.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import holdingLocationsRoute from '../holdings/{countyId}/{parishId}/{holdingId}/locations.js'
import findRoute from './find.js'
import * as getRoute from './{locationId}.js'

/**
 * The regression guard for the location queries (_Location query fan-out_ and
 * DSFAAP-2983): the responses of the three endpoints that read
 * find-locations.sql or get-location.sql, for every fixture location with an
 * `L` number, captured in the snapshot before the queries changed.
 */
const FIXTURE_LOCATION_IDS = [
  'L298210',
  'L298220',
  'L298300',
  'L97339',
  'L98001',
  'L98002',
  'L98003'
]

// the CPHs whose holderships are at those locations and have a holder;
// L97339 and L98003 have no holdership, and L298300's have no holder
const FIXTURE_CPHS = [
  '29/820/0001',
  '29/820/0002',
  '98/001/0001',
  '98/002/0001'
]

/** @type {import('@hapi/hapi').Server} */
let server

beforeAll(async () => {
  server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    oracleDb
  ])

  registerSimpleAuthStrategy(server)

  server.route({ ...findRoute, path: '/locations/find' })

  server.route({
    method: 'GET',
    path: '/locations/{locationId}',
    handler: getRoute.handler,
    options: getRoute.options
  })

  server.route({
    ...holdingLocationsRoute,
    path: '/holdings/{countyId}/{parishId}/{holdingId}/locations'
  })
})

afterAll(() => server.stop())

test('POST /locations/find is unchanged', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/locations/find',
    payload: { ids: FIXTURE_LOCATION_IDS }
  })

  expect({
    statusCode: response.statusCode,
    result: response.result
  }).toMatchSnapshot()
})

test.each(FIXTURE_LOCATION_IDS)(
  'GET /locations/%s is unchanged',
  async (locationId) => {
    const response = await server.inject({ url: `/locations/${locationId}` })

    expect({
      statusCode: response.statusCode,
      result: response.result
    }).toMatchSnapshot()
  }
)

test.each(FIXTURE_CPHS)(
  'GET /holdings/%s/locations is unchanged',
  async (cph) => {
    const response = await server.inject({ url: `/holdings/${cph}/locations` })

    expect({
      statusCode: response.statusCode,
      result: response.result
    }).toMatchSnapshot()
  }
)
