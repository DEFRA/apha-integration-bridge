import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

import { oracleDb } from '../../../../../common/helpers/oracledb.js'
import { registerSimpleAuthStrategy } from '../../../../../common/helpers/test-helpers/simple-auth.js'
import { versionPlugin } from '../../../../../common/helpers/versioning.js'
import route from './suppliers.js'

/**
 * Runs against the local Oracle fixtures. 29/820/0001 and its suppliers are
 * seeded by .docker-compose/oracledb/015_add_holding_sub_resource_scenarios.sql
 */

/** @type {import('@hapi/hapi').Server} */
let server

beforeAll(async () => {
  server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    versionPlugin,
    oracleDb
  ])

  registerSimpleAuthStrategy(server)

  server.route({
    ...route,
    path: '/holdings/{countyId}/{parishId}/{holdingId}/suppliers'
  })
})

afterAll(() => server.stop())

/**
 * @param {string} cph
 * @param {Record<string, string>} [headers]
 */
const getSuppliers = async (cph, headers) => {
  const response = await server.inject({
    url: `/holdings/${cph}/suppliers`,
    headers
  })

  return {
    statusCode: response.statusCode,
    result: /** @type {Record<string, any>} */ (response.result)
  }
}

const organisation = (id, organisationName, supplierType, involvements) => ({
  type: 'suppliers',
  id,
  partyType: 'ORGANISATION',
  title: null,
  firstName: null,
  lastName: null,
  organisationName,
  supplierTypes: [supplierType],
  involvements
})

const involvement = (involvementType, locationId, livestockUnitId, from) => ({
  involvementType,
  locationId,
  livestockUnitId,
  from
})

const deliveryPartnerOfU298240 = organisation(
  'C2982007',
  'Dale Delivery Partnership',
  'DELIVERYPARTNER',
  [involvement('DPFOR', 'L298210', 'U298240', '2022-01-01')]
)

describe('GET /holdings/{countyId}/{parishId}/{holdingId}/suppliers', () => {
  test('returns each supplier once, with an entry per livestock unit and involvement type', async () => {
    const { statusCode, result } = await getSuppliers('29/820/0001')

    expect(statusCode).toBe(200)

    // U298240 has an OV practice and a DP, and the practice also serves
    // U298241; the practice whose OVFOR on U298240 ended is absent
    expect(result).toEqual({
      data: [
        organisation('C2982006', 'Hill Vets Ltd', 'OVPRACTICE', [
          involvement('OVFOR', 'L298210', 'U298240', '2016-05-01'),
          involvement('OVFOR', 'L298220', 'U298241', '2021-01-01')
        ]),
        deliveryPartnerOfU298240
      ],
      links: { self: '/holdings/29/820/0001/suppliers' }
    })
  })

  test('returns the suppliers of a shared location under each CPH held there', async () => {
    const { statusCode, result } = await getSuppliers('29/820/0002')

    expect(statusCode).toBe(200)
    expect(result.data).toEqual([
      organisation('C2982006', 'Hill Vets Ltd', 'OVPRACTICE', [
        involvement('OVFOR', 'L298210', 'U298240', '2016-05-01')
      ]),
      deliveryPartnerOfU298240
    ])
  })

  test.each([
    // its location has no livestock unit
    '22/222/2222',
    // its unit has keepers and an owner but no supplier
    '98/001/0001'
  ])('returns no suppliers for %s', async (cph) => {
    const { statusCode, result } = await getSuppliers(cph)

    expect(statusCode).toBe(200)
    expect(result).toEqual({
      data: [],
      links: { self: `/holdings/${cph}/suppliers` }
    })
  })

  test.each(['00/000/0000', '99/999/9999'])(
    'returns 404 for %s, which has no active holdership',
    async (cph) => {
      const { statusCode, result } = await getSuppliers(cph)

      expect(statusCode).toBe(404)
      expect(result).toEqual({
        message: 'Holding not found or inactive',
        code: 'NOT_FOUND',
        errors: []
      })
    }
  )

  test('returns 404 for an unsupported version', async () => {
    const { statusCode, result } = await getSuppliers('29/820/0001', {
      accept: 'application/vnd.apha.2+json'
    })

    expect(statusCode).toBe(404)
    expect(result.code).toBe('UNSUPPORTED_VERSION')
  })
})
