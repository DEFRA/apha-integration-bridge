import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import {
  test,
  expect,
  describe,
  beforeAll,
  afterAll,
  afterEach,
  jest
} from '@jest/globals'
import route from './find.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { HTTPException } from '../../lib/http/http-exception.js'
import * as executeOperation from '../../lib/db/operations/execute.js'

/**
 * @import {PostFindHoldingsResponse} from './find.js'
 */

const path = '/holdings/find'

describe('holdings/find', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeAll(async () => {
    server = Hapi.server({ port: 0 })

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
  })

  afterAll(async () => {
    await server.stop()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Payload validation', () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`

    test('passes validation for valid holding ids payload', async () => {
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['11/111/1111']
        },
        url
      })

      expect(response.statusCode).not.toBe(400)

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(responseBody.code).not.toBe('BAD_REQUEST')
    })

    test('fails validation for invalid holding ids payload', async () => {
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
    const testHoldings = {
      holding1: '11/111/1111',
      holding2: '22/222/2222',
      holding3: '33/333/3333'
    }

    const expectedHoldingsData = {
      holding1: {
        type: 'holdings',
        id: '11/111/1111',
        localAuthority: 'Local Authority 11/111',
        relationships: {
          cphHolder: {
            data: null
          },
          location: {
            data: null
          }
        }
      },
      holding2: {
        type: 'holdings',
        id: '22/222/2222',
        localAuthority: 'Local Authority 22/222',
        relationships: {
          cphHolder: {
            data: null
          },
          location: {
            data: null
          }
        }
      },
      holding3: {
        type: 'holdings',
        id: '33/333/3333',
        localAuthority: 'Local Authority 33/333',
        relationships: {
          cphHolder: {
            data: null
          },
          location: { data: null }
        }
      }
    }

    test('returns all matching ids', async () => {
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [testHoldings.holding1, testHoldings.holding2]
        },
        url
      })

      expect(response.result).toEqual({
        data: [expectedHoldingsData.holding1, expectedHoldingsData.holding2],
        links: {
          self: url,
          next: null,
          prev: null
        }
      })
    })

    test('returns an empty array for no matches', async () => {
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['99/999/9999']
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

    test('returns holdings paginated', async () => {
      const requestIds = [
        testHoldings.holding1,
        testHoldings.holding2,
        testHoldings.holding3
      ]
      const queryParamsPage1 = new URLSearchParams({
        page: '1',
        pageSize: '1'
      })
      const queryParamsPage2 = new URLSearchParams({
        page: '2',
        pageSize: '1'
      })
      const queryParamsPage3 = new URLSearchParams({
        page: '3',
        pageSize: '1'
      })
      const urlPage1 = `${path}?${queryParamsPage1.toString()}`
      const urlPage2 = `${path}?${queryParamsPage2.toString()}`
      const urlPage3 = `${path}?${queryParamsPage3.toString()}`

      const firstResponse = await server.inject({
        method: 'POST',
        payload: {
          ids: requestIds
        },
        url: urlPage1
      })

      const firstResponseResult = /** @type {PostFindHoldingsResponse} */ (
        firstResponse.result
      )

      expect(firstResponseResult).toEqual({
        data: [expectedHoldingsData.holding1],
        links: {
          self: urlPage1,
          next: urlPage2,
          prev: null
        }
      })

      const secondResponse = await server.inject({
        method: 'POST',
        payload: {
          ids: requestIds
        },
        url: firstResponseResult.links.next
      })

      const secondResponseResult = /** @type {PostFindHoldingsResponse} */ (
        secondResponse.result
      )

      expect(secondResponseResult).toEqual({
        data: [expectedHoldingsData.holding2],
        links: {
          self: urlPage2,
          next: urlPage3,
          prev: urlPage1
        }
      })

      const thirdResponse = await server.inject({
        method: 'POST',
        payload: {
          ids: requestIds
        },
        url: secondResponseResult.links.next
      })

      const thirdResponseResult = /** @type {PostFindHoldingsResponse} */ (
        thirdResponse.result
      )

      expect(thirdResponseResult).toEqual({
        data: [expectedHoldingsData.holding3],
        links: {
          self: urlPage3,
          next: null,
          prev: urlPage2
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
      jest
        .spyOn(executeOperation, 'execute')
        .mockRejectedValueOnce(new Error('Simulated database failure'))

      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['11/111/1111']
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
          ids: ['11/111/1111']
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
