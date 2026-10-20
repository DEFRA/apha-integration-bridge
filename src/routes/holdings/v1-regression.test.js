import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, expect, test } from '@jest/globals'

import { oracleDb } from '../../common/helpers/oracledb.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import findRoute from './find.js'
import * as getRoute from './{countyId}/{parishId}/{holdingId}.js'

/**
 * The regression guard for the holding sub-resources (DSFAAP-2982): the v1
 * responses of the two existing holding endpoints for every CPH in the local
 * fixtures, captured in the snapshot before the change. The only permitted
 * differences are the declared additions, removed here before comparing, and
 * the holdership `POST /holdings/find` now selects for a CPH with several,
 * which find.test.js asserts.
 */
const FIXTURE_CPHS = [
  '01/001/0001',
  '01/409/1111',
  '04/432/1234',
  '07/094/0117',
  '07/204/6008',
  '07/204/6031',
  '11/111/1111',
  '14/159/0112',
  '22/222/2222',
  '33/333/3333',
  '45/001/0002',
  '52/078/0012',
  '66/053/0218',
  '76/348/0005',
  '79/440/8500',
  '98/001/0001',
  '98/002/0001',
  '99/999/9999'
]

const MULTI_HOLDERSHIP_CPH = '01/409/1111'

// fixture 015's multi-holdership CPH, added with the sub-resources; GET must
// still answer it with 409
const ADDED_MULTI_HOLDERSHIP_CPH = '29/820/0001'

/** @type {import('@hapi/hapi').Server} */
let server

beforeAll(async () => {
  server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    oracleDb
  ])

  registerSimpleAuthStrategy(server)

  server.route({
    method: 'GET',
    path: '/holdings/{countyId}/{parishId}/{holdingId}',
    handler: getRoute.handler,
    options: getRoute.options
  })

  server.route({ ...findRoute, path: '/holdings/find' })
})

afterAll(() => server.stop())

test.each([...FIXTURE_CPHS, ADDED_MULTI_HOLDERSHIP_CPH])(
  'GET /holdings/%s is unchanged apart from localAuthority',
  async (cph) => {
    const response = await server.inject({ url: `/holdings/${cph}` })

    const result = /** @type {Record<string, any>} */ (response.result)

    if (result.data) {
      delete result.data.localAuthority
    }

    expect({ statusCode: response.statusCode, result }).toMatchSnapshot()
  }
)

test('POST /holdings/find is unchanged apart from cphType', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/holdings/find',
    payload: {
      ids: FIXTURE_CPHS.filter((cph) => cph !== MULTI_HOLDERSHIP_CPH)
    }
  })

  const result = /** @type {Record<string, any>} */ (response.result)

  for (const holding of result.data) {
    delete holding.cphType
  }

  expect({ statusCode: response.statusCode, result }).toMatchSnapshot()
})
