import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

import { oracleDb } from '../../../../../common/helpers/oracledb.js'
import { registerSimpleAuthStrategy } from '../../../../../common/helpers/test-helpers/simple-auth.js'
import { versionPlugin } from '../../../../../common/helpers/versioning.js'
import route from './locations.js'

/**
 * Runs against the local Oracle fixtures. 29/820/0001 is seeded by
 * .docker-compose/oracledb/015_add_holding_sub_resource_scenarios.sql and
 * 98/001/0001's sub-locations by 011_add_holdership_and_sub_location_columns.sql
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
    path: '/holdings/{countyId}/{parishId}/{holdingId}/locations'
  })
})

afterAll(() => server.stop())

/**
 * @param {string} cph
 * @param {Record<string, string>} [headers]
 */
const getLocations = async (cph, headers) => {
  const response = await server.inject({
    url: `/holdings/${cph}/locations`,
    headers
  })

  return {
    statusCode: response.statusCode,
    result: /** @type {Record<string, any>} */ (response.result)
  }
}

const addressableObject = (description = null) => ({
  startNumber: null,
  startNumberSuffix: null,
  endNumber: null,
  endNumberSuffix: null,
  description
})

const noAddress = {
  primaryAddressableObject: addressableObject(),
  secondaryAddressableObject: addressableObject(),
  street: null,
  locality: null,
  town: null,
  county: null,
  postcode: null,
  countryCode: null,
  ukInternalCode: null
}

const hillTopFarmAddress = {
  ...noAddress,
  primaryAddressableObject: addressableObject('Hill Top Farm'),
  street: 'Hill Lane',
  town: 'Exampleton',
  postcode: 'EX2 9HT',
  countryCode: 'GB',
  ukInternalCode: 'England'
}

const hillTopYardAddress = {
  ...noAddress,
  primaryAddressableObject: addressableObject('Hill Top Yard'),
  street: 'Back Lane',
  town: 'Exampleton',
  postcode: 'EX2 9HY'
}

const hillTopFarm = {
  type: 'locations',
  id: 'L298210',
  name: 'Hill Top Farm',
  status: {
    code: 'COMPLETE',
    reasonCode: null,
    since: '2015-01-01T09:30:00Z'
  },
  address: hillTopFarmAddress,
  addresses: [
    { ...hillTopFarmAddress, isPreferred: true, from: '2015-01-01' },
    { ...hillTopYardAddress, isPreferred: false, from: '2019-01-01' }
  ],
  osMapReference: 'SK3530036300',
  position: {
    easting: 435300,
    northing: 336300,
    osMapReference: 'SK3530036300',
    pointType: 'ACCESSPOINT'
  },
  subLocations: [],
  livestockUnits: [
    {
      type: 'animal-commodities',
      id: 'U298240',
      animalQuantities: 0,
      species: null
    }
  ],
  facilities: [],
  relationships: {
    holdings: {
      data: [
        { type: 'holdings', id: '29/820/0001' },
        { type: 'holdings', id: '29/820/0002' }
      ]
    }
  }
}

const lowBarn = {
  type: 'locations',
  id: 'L298220',
  name: 'Low Barn',
  status: {
    code: 'MIGRATED',
    reasonCode: 'VETNETDATAMIG',
    since: '2008-01-31T00:00:00Z'
  },
  address: noAddress,
  addresses: [],
  osMapReference: null,
  position: null,
  subLocations: [],
  livestockUnits: [
    {
      type: 'animal-commodities',
      id: 'U298241',
      animalQuantities: 0,
      species: null
    }
  ],
  facilities: [],
  relationships: {
    holdings: { data: [{ type: 'holdings', id: '29/820/0001' }] }
  }
}

/**
 * find-locations.sql does not order the holdings at a location
 *
 * @param {Record<string, any>[]} data
 */
const withSortedHoldings = (data) =>
  data.map((item) => ({
    ...item,
    relationships: {
      holdings: {
        data: item.relationships.holdings.data.toSorted((a, b) =>
          a.id.localeCompare(b.id)
        )
      }
    }
  }))

describe('GET /holdings/{countyId}/{parishId}/{holdingId}/locations', () => {
  test('returns one item per holdership, the selected one first, with position and addresses', async () => {
    const { statusCode, result } = await getLocations('29/820/0001')

    expect(statusCode).toBe(200)

    // core 2 started last, so it is selected; it is stored twice in SAM but
    // listed once. L298210 is held under cores 1 and 3, so it appears twice.
    expect({ ...result, data: withSortedHoldings(result.data) }).toEqual({
      data: [
        {
          ...lowBarn,
          holdership: {
            vetnetCoreId: '2',
            from: '2020-06-01',
            cphType: 'TEMPORARY',
            selected: true
          }
        },
        {
          ...hillTopFarm,
          holdership: {
            vetnetCoreId: '3',
            from: '2018-03-01',
            cphType: 'PERMANENT',
            selected: false
          }
        },
        {
          ...hillTopFarm,
          holdership: {
            vetnetCoreId: '1',
            from: '2015-01-01',
            cphType: 'PERMANENT',
            selected: false
          }
        }
      ],
      links: { self: '/holdings/29/820/0001/locations' }
    })
  })

  test('returns the sub-locations of a premises and the latest of two current points', async () => {
    const { statusCode, result } = await getLocations('98/001/0001')

    expect(statusCode).toBe(200)
    expect(result.data).toHaveLength(1)

    const [location] = result.data

    expect(location.position).toEqual({
      easting: 412345,
      northing: 323456,
      osMapReference: 'SK123456',
      pointType: 'CENTROID'
    })
    expect(location.subLocations).toEqual([
      {
        type: 'sub-locations',
        id: '97001',
        name: 'Shed 1',
        subLocationType: 'BROILERSHED',
        usableArea: 1200,
        usualStockQuantity: 30000,
        broilerStockingDensityRange: '33-39',
        status: {
          code: 'COMPLETE',
          reasonCode: null,
          since: '2015-03-01T00:00:00Z'
        },
        position: null
      },
      {
        type: 'sub-locations',
        id: '97002',
        name: 'Top Field',
        subLocationType: 'FIELD',
        usableArea: null,
        usualStockQuantity: null,
        broilerStockingDensityRange: null,
        status: {
          code: 'MIGRATED',
          reasonCode: 'VETNETDATAMIG',
          since: '2008-01-01T00:00:00Z'
        },
        position: null
      }
    ])
  })

  test.each(['00/000/0000', '99/999/9999'])(
    'returns 404 for %s, which has no active holdership',
    async (cph) => {
      const { statusCode, result } = await getLocations(cph)

      expect(statusCode).toBe(404)
      expect(result).toEqual({
        message: 'Holding not found or inactive',
        code: 'NOT_FOUND',
        errors: []
      })
    }
  )

  test('returns 404 for an unsupported version', async () => {
    const { statusCode, result } = await getLocations('29/820/0001', {
      accept: 'application/vnd.apha.2+json'
    })

    expect(statusCode).toBe(404)
    expect(result.code).toBe('UNSUPPORTED_VERSION')
  })
})
