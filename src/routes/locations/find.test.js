import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { test, expect, describe, afterEach, jest } from '@jest/globals'
import route from './find.js'
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

    const expectedLocationsData = {
      location1: {
        type: 'locations',
        id: 'L98001',
        name: 'Test Farm Location',
        address: {
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
          countryCode: 'GB'
        },
        osMapReference: 'SK123456',
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
        address: {
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
          countryCode: 'GB'
        },
        osMapReference: 'SK789012',
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
