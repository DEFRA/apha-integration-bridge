import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { test, expect, describe, afterEach, jest } from '@jest/globals'
import route from './find.js'
import { clientScopesPlugin } from '../../common/helpers/client-scopes.js'
import { piiContextPlugin } from '../../common/helpers/pii-context.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { HTTPException } from '../../lib/http/http-exception.js'
import * as executeOperation from '../../lib/db/operations/execute.js'
/**
 * @import {PostFindLocationsResponse} from './find.js'
 * @import {Locations} from '../../types/find/locations.js'
 */

const path = '/locations/find'

async function createServer() {
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

  registerSimpleAuthStrategy(server)

  server.route({
    ...route,
    path,
    method: 'POST'
  })

  return server
}

describe('locations/find', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Payload validation', () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`

    test('passes validation for valid location ids payload', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['L98001']
        },
        url
      })

      expect(response.statusCode).not.toBe(400)

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(responseBody.code).not.toBe('BAD_REQUEST')
    })

    test('fails validation for invalid location ids payload', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['invalid-id-format']
        },
        url
      })

      expect(response.statusCode).toBe(400)

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(responseBody.code).toBe('BAD_REQUEST')
      expect(responseBody.errors).toBeDefined()
      expect(responseBody.errors.length).toBeGreaterThan(0)
      expect(responseBody.errors[0].code).toBe('VALIDATION_ERROR')
    })

    test('fails validation for missing ids payload', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {},
        url
      })

      expect(response.statusCode).toBe(400)

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(responseBody.code).toBe('BAD_REQUEST')
      expect(responseBody.errors).toBeDefined()
      expect(responseBody.errors.length).toBeGreaterThan(0)
      expect(responseBody.errors[0].code).toBe('VALIDATION_ERROR')
    })

    test('fails validation for non-array ids payload', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: 'not-an-array'
        },
        url
      })

      expect(response.statusCode).toBe(400)

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(responseBody.code).toBe('BAD_REQUEST')
      expect(responseBody.errors).toBeDefined()
      expect(responseBody.errors.length).toBeGreaterThan(0)
      expect(responseBody.errors[0].code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Handler logic', () => {
    const testLocations = {
      location1: 'L98001',
      location2: 'L98002'
    }

    const location1Address = {
      primaryAddressableObject: {
        startNumber: 123,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: 'Test Building'
      },
      secondaryAddressableObject: {
        startNumber: null,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: 'Unit 1'
      },
      street: 'Test Street',
      locality: 'Test Locality',
      town: 'Test Town',
      postcode: 'TE1 1ST',
      countryCode: 'UK123',
      county: 'Test County'
    }

    const location2Address = {
      primaryAddressableObject: {
        startNumber: 456,
        startNumberSuffix: 'A',
        endNumber: null,
        endNumberSuffix: null,
        description: 'Farm House'
      },
      secondaryAddressableObject: {
        startNumber: null,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: null
      },
      street: 'Farm Road',
      locality: 'Little Village',
      town: 'Bigtown',
      postcode: 'TE2 2ST',
      countryCode: 'UK456',
      county: 'Shire'
    }

    // fixture 001 seeds both as ACTIVE and 011 dates their states
    const active = {
      code: 'ACTIVE',
      reasonCode: null,
      since: '2008-01-01T00:00:00Z'
    }

    const expectedLocationsData = {
      location1: {
        type: 'locations',
        id: 'L98001',
        name: 'Test Farm Location',
        status: active,
        address: location1Address,
        addresses: [
          { ...location1Address, isPreferred: true, from: '2008-01-01' }
        ],
        osMapReference: 'SK123456',
        position: {
          easting: 412345,
          northing: 323456,
          osMapReference: 'SK123456',
          pointType: 'CENTROID'
        },
        subLocations: [
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
            // fixture 018: the later of two current points, and the postal
            // address although a non-postal one started later
            position: {
              easting: 412310,
              northing: 323410,
              osMapReference: 'SK1231023410',
              pointType: 'BUILDING'
            },
            address: {
              primaryAddressableObject: {
                startNumber: null,
                startNumberSuffix: null,
                endNumber: null,
                endNumberSuffix: null,
                description: 'Shed 1'
              },
              secondaryAddressableObject: {
                startNumber: null,
                startNumberSuffix: null,
                endNumber: null,
                endNumberSuffix: null,
                description: null
              },
              street: 'Test Street',
              locality: null,
              town: 'Test Town',
              county: 'Test County',
              postcode: 'TE1 1SH',
              countryCode: 'UK123',
              isPreferred: true,
              from: '2015-03-01'
            }
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
        ],
        livestockUnits: [
          {
            type: 'animal-commodities',
            id: 'LU98001001',
            animalQuantities: 50,
            species: 'CATTLE'
          }
        ],
        facilities: [
          {
            type: 'facilities',
            id: 'F98001001',
            name: 'Main Cattle Facility',
            facilityType: 'Animal Breeding',
            businessActivity: 'Cattle breeding and dairy production'
          }
        ],
        relationships: {
          holdings: {
            data: [
              {
                type: 'holdings',
                id: '98/001/0001'
              }
            ]
          }
        }
      },
      location2: {
        type: 'locations',
        id: 'L98002',
        name: 'Highland Farm',
        status: active,
        address: location2Address,
        addresses: [
          { ...location2Address, isPreferred: true, from: '2008-01-01' }
        ],
        osMapReference: 'SK789012',
        position: {
          easting: null,
          northing: null,
          osMapReference: 'SK789012',
          pointType: 'NOTKNOWN'
        },
        subLocations: [],
        livestockUnits: [
          {
            type: 'animal-commodities',
            id: 'LU98002001',
            animalQuantities: 100,
            species: 'SHEEP'
          }
        ],
        facilities: [],
        relationships: {
          holdings: {
            data: [
              {
                type: 'holdings',
                id: '98/002/0001'
              }
            ]
          }
        }
      }
    }

    test('returns all matching ids', async () => {
      const server = await createServer()
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [testLocations.location1, testLocations.location2]
        },
        url
      })

      expect(response.result).toEqual({
        data: [
          expectedLocationsData.location1,
          expectedLocationsData.location2
        ],
        links: {
          self: url,
          next: null,
          prev: null
        }
      })
    })

    test('returns locations in order requested', async () => {
      const server = await createServer()

      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })

      const url = `${path}?${queryParams.toString()}`

      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [testLocations.location2, testLocations.location1]
        },
        url
      })

      const responseResult = /** @type {PostFindLocationsResponse} */ (
        response.result
      )

      expect(responseResult.data[0].id).toBe(testLocations.location2)
      expect(responseResult.data[1].id).toBe(testLocations.location1)
    })

    test('returns empty data and does not query DB when page is out of range', async () => {
      const server = await createServer()
      const executeSpy = jest.spyOn(executeOperation, 'execute')
      const queryParams = new URLSearchParams({
        page: '2',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [testLocations.location1]
        },
        url
      })

      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({
        data: [],
        links: {
          self: url,
          next: null,
          prev: '/locations/find?page=1&pageSize=10'
        }
      })
      expect(executeSpy).not.toHaveBeenCalled()
    })

    test('returns an empty array for no matches', async () => {
      const server = await createServer()
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['L99999']
        },
        url
      })

      expect(response.result).toEqual({
        data: [],
        links: {
          self: url,
          next: null,
          prev: null
        }
      })
    })

    test('returns locations paginated', async () => {
      const server = await createServer()

      const requestIds = [testLocations.location1, testLocations.location2]

      const queryParamsPage1 = new URLSearchParams({
        page: '1',
        pageSize: '1'
      })

      const queryParamsPage2 = new URLSearchParams({
        page: '2',
        pageSize: '1'
      })

      const urlPage1 = `${path}?${queryParamsPage1.toString()}`
      const urlPage2 = `${path}?${queryParamsPage2.toString()}`

      const firstResponse = await server.inject({
        method: 'POST',
        payload: { ids: requestIds },
        url: urlPage1
      })

      expect(firstResponse.result).toEqual({
        data: [expectedLocationsData.location1],
        links: {
          self: urlPage1,
          next: urlPage2,
          prev: null
        }
      })

      const secondResponse = await server.inject({
        method: 'POST',
        payload: { ids: requestIds },
        url: urlPage2
      })

      expect(secondResponse.result).toEqual({
        data: [expectedLocationsData.location2],
        links: {
          self: urlPage2,
          next: null,
          prev: urlPage1
        }
      })
    })

    test('returns next page link when a missing id reduces first page result count', async () => {
      const server = await createServer()

      const firstQueryParams = new URLSearchParams({
        page: '1',
        pageSize: '2'
      })

      const firstUrl = `${path}?${firstQueryParams.toString()}`
      const payload = {
        ids: [testLocations.location1, 'L99999', testLocations.location2]
      }

      const firstResponse = await server.inject({
        method: 'POST',
        payload,
        url: firstUrl
      })

      const secondQueryParams = new URLSearchParams(firstQueryParams.toString())

      secondQueryParams.set('page', '2')

      const firstResponseResult = /** @type {PostFindLocationsResponse} */ (
        firstResponse.result
      )

      expect(firstResponse.statusCode).toBe(200)
      expect(firstResponseResult).toEqual({
        data: [expectedLocationsData.location1],
        links: {
          self: firstUrl,
          next: `${path}?${secondQueryParams.toString()}`,
          prev: null
        }
      })

      const secondResponse = await server.inject({
        method: 'POST',
        payload,
        url: firstResponseResult.links.next
      })

      const secondResponseResult = /** @type {PostFindLocationsResponse} */ (
        secondResponse.result
      )

      expect(secondResponse.statusCode).toBe(200)
      expect(secondResponseResult).toEqual({
        data: [expectedLocationsData.location2],
        links: {
          self: `${path}?${secondQueryParams.toString()}`,
          next: null,
          prev: firstUrl
        }
      })
    })
  })

  describe('Error handling', () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    test('wraps non HTTPException errors into INTERNAL_SERVER_ERROR', async () => {
      const server = await createServer()
      jest
        .spyOn(executeOperation, 'execute')
        .mockRejectedValueOnce(new Error('Simulated database failure'))

      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['L98001']
        },
        url
      })

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(response.statusCode).toBe(500)
      expect(responseBody.code).toBe('INTERNAL_SERVER_ERROR')
      expect(responseBody.message).toBe(
        'An error occurred while processing your request'
      )
      expect(responseBody.errors).toBeDefined()
      expect(responseBody.errors.length).toBeGreaterThan(0)
      expect(responseBody.errors[0].code).toBe('DATABASE_ERROR')
    })

    test('returns thrown HTTPException without wrapping', async () => {
      const server = await createServer()
      jest
        .spyOn(executeOperation, 'execute')
        .mockRejectedValueOnce(
          new HTTPException(
            'BAD_REQUEST',
            'Deliberate HTTP exception from mocked execute'
          )
        )

      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['L98001']
        },
        url
      })

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(response.statusCode).toBe(400)
      expect(responseBody.code).toBe('BAD_REQUEST')
      expect(responseBody.message).toBe(
        'Deliberate HTTP exception from mocked execute'
      )
      expect(responseBody.errors).toEqual([])
    })
  })
})

describe('locations/find status and personal data', () => {
  const PII_CLIENT_ID = 'pii-client'

  /**
   * @param {string[]} ids
   * @param {Record<string, string>} [headers]
   */
  const find = async (ids, headers = { 'x-client-id': PII_CLIENT_ID }) => {
    const server = Hapi.server({ port: 0 })

    await server.register([
      { plugin: hapiPino, options: { enabled: false } },
      {
        plugin: clientScopesPlugin,
        options: {
          clientsScopes: [{ client_id: PII_CLIENT_ID, scopes: ['pii'] }]
        }
      },
      piiContextPlugin,
      oracleDb
    ])

    registerSimpleAuthStrategy(server, {
      getClientId: (request) => request.headers['x-client-id']
    })

    server.route({ ...route, path, method: 'POST' })

    const response = await server.inject({
      method: 'POST',
      url: path,
      payload: { ids },
      headers
    })

    return /** @type {Record<string, any>} */ (response.result).data
  }

  /**
   * @param {Record<string, any>} location
   */
  const personalData = (location) => ({
    name: location.name,
    subLocationNames: location.subLocations.map((s) => s.name),
    // Shed 1's own address (fixture 018)
    shedAddress: location.subLocations[0].address,
    address: location.address,
    addresses: location.addresses.map(({ isPreferred, from, ...address }) => ({
      ...address
    }))
  })

  test('masks the names and the address of a client without the pii scope', async () => {
    const [location] = await find(['L98001'], {})

    const maskedAddress = expect.objectContaining({
      street: 'T*********t', // Test Street
      locality: 'T***********y', // Test Locality
      town: 'T*******n', // Test Town
      county: 'T*********y', // Test County
      postcode: 'T*****T', // TE1 1ST
      countryCode: 'UK123'
    })

    expect(personalData(location)).toEqual({
      name: 'T****************n', // Test Farm Location
      subLocationNames: ['S****1', 'T*******d'], // Shed 1, Top Field
      shedAddress: expect.objectContaining({
        street: 'T*********t', // Test Street
        town: 'T*******n', // Test Town
        county: 'T*********y', // Test County
        postcode: 'T*****H' // TE1 1SH
      }),
      address: maskedAddress,
      addresses: [maskedAddress]
    })
  })

  test('returns the names and the address unmasked to a client with the pii scope', async () => {
    const [location] = await find(['L98001'])

    const address = expect.objectContaining({
      street: 'Test Street',
      locality: 'Test Locality',
      town: 'Test Town',
      county: 'Test County',
      postcode: 'TE1 1ST'
    })

    expect(personalData(location)).toEqual({
      name: 'Test Farm Location',
      subLocationNames: ['Shed 1', 'Top Field'],
      shedAddress: expect.objectContaining({
        street: 'Test Street',
        town: 'Test Town',
        county: 'Test County',
        postcode: 'TE1 1SH'
      }),
      address,
      addresses: [address]
    })
  })

  // SAM does not enforce one current state per feature; both are seeded by
  // .docker-compose/oracledb/017_add_location_status_scenarios.sql
  test.each([
    [
      'L298360',
      'the later of two current states',
      'PARTIAL',
      null,
      '2020-01-01T09:00:00Z'
    ],
    [
      'L298370',
      'the higher key of two current states from the same moment',
      'MIGRATED',
      'VETNETDATAMIG',
      '2008-01-31T00:00:00Z'
    ]
  ])('returns %s with %s', async (locationId, _, code, reasonCode, since) => {
    const [location] = await find([locationId])

    expect(location.status).toEqual({ code, reasonCode, since })
  })

  // seeded by .docker-compose/oracledb/019_add_sub_location_status_scenarios.sql
  test('gives each sub-location its state by the same rule, and leaves out one that is only INACTIVE', async () => {
    const [location] = await find(['L298390'])

    expect(
      location.subLocations.map(({ id, status }) => ({ id, status }))
    ).toEqual([
      {
        id: '298391',
        status: {
          code: 'COMPLETE',
          reasonCode: null,
          since: '2020-01-01T09:00:00Z'
        }
      },
      {
        id: '298392',
        status: {
          code: 'MIGRATED',
          reasonCode: 'VETNETDATAMIG',
          since: '2008-01-31T00:00:00Z'
        }
      },
      {
        id: '298393',
        status: {
          code: 'COMPLETE',
          reasonCode: null,
          since: '2015-01-01T09:00:00Z'
        }
      }
    ])
  })
})
