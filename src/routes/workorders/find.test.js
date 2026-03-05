import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { test, expect, describe, afterEach, jest } from '@jest/globals'
import route from './find.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { HTTPException } from '../../lib/http/http-exception.js'
import * as executeOperation from '../../lib/db/operations/execute.js'

/**
 * @import {PostFindWorkordersResponse} from './find.js'
 * @import {Workorders} from '../../types/find/workorders.js'
 */

const path = '/workorders/find'

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

describe('workorders/find', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Payload validation', () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`

    test('passes validation for valid workorder ids payload', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['WS-12345']
        },
        url
      })

      expect(response.statusCode).not.toBe(400)

      const responseBody = /** @type {Record<string, any>} */ (response.result)

      expect(responseBody.code).not.toBe('BAD_REQUEST')
    })

    test('fails validation for invalid workorder ids payload', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['']
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
    const testWorkorders = {
      workorder1: 'WS-76512',
      workorder2: 'WS-76513',
      workorder3: 'WS-76514'
    }

    const expectedWorkordersData = {
      workorder1: {
        type: 'workorders',
        id: 'WS-76512',
        activationDate: '2024-01-15',
        businessArea: 'Animal Health',
        workArea: 'Disease Control',
        country: 'GB',
        aim: 'Surveillance',
        purpose: 'Monitoring',
        earliestActivityStartDate: '2024-02-01',
        species: 'Cattle',
        activities: [
          {
            type: 'activities',
            id: 'ACT-001',
            activityName: 'Site Inspection',
            sequenceNumber: 1
          }
        ],
        phase: 'Active',
        relationships: {
          customerOrOrganisation: {
            data: {
              id: 'C001',
              type: 'customerOrOrganisation'
            }
          },
          holding: {
            data: {
              id: '11/111/1111',
              type: 'holdings'
            }
          },
          facilities: {
            data: [
              {
                id: 'F001',
                type: 'facilities'
              }
            ]
          },
          location: {
            data: {
              id: 'L001',
              type: 'locations'
            }
          },
          livestockUnits: {
            data: [
              {
                id: 'LU001',
                type: 'animal-commodities'
              }
            ]
          }
        }
      },
      workorder2: {
        type: 'workorders',
        id: 'WS-76513',
        activationDate: '2024-02-20',
        businessArea: 'Plant Health',
        workArea: 'Pest Control',
        country: 'GB',
        aim: 'Eradication',
        purpose: 'Treatment',
        earliestActivityStartDate: '2024-03-01',
        species: 'Plants',
        activities: [
          {
            type: 'activities',
            id: 'ACT-002',
            activityName: 'Field Survey',
            sequenceNumber: 1
          }
        ],
        phase: 'Planning',
        relationships: {
          customerOrOrganisation: {
            data: {
              id: 'C002',
              type: 'customerOrOrganisation'
            }
          },
          holding: {
            data: {
              id: '22/222/2222',
              type: 'holdings'
            }
          },
          facilities: {
            data: [
              {
                id: 'F002',
                type: 'facilities'
              },
              {
                id: 'F003',
                type: 'facilities'
              }
            ]
          },
          location: {
            data: {
              id: 'L002',
              type: 'locations'
            }
          },
          livestockUnits: {
            data: [
              {
                id: 'LU002',
                type: 'animal-commodities'
              }
            ]
          }
        }
      },
      workorder3: {
        type: 'workorders',
        id: 'WS-76514',
        activationDate: null,
        businessArea: null,
        workArea: null,
        country: null,
        aim: null,
        purpose: null,
        earliestActivityStartDate: null,
        species: null,
        activities: [],
        phase: null,
        relationships: {
          customerOrOrganisation: {
            data: null
          },
          holding: {
            data: null
          },
          facilities: {
            data: []
          },
          location: {
            data: null
          },
          livestockUnits: {
            data: []
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
          ids: [testWorkorders.workorder1] //, testWorkorders.workorder2]
        },
        url
      })

      expect(response.result).toEqual({
        data: [
          expectedWorkordersData.workorder1,
          expectedWorkordersData.workorder2
        ],
        links: {
          self: url,
          next: null,
          prev: null
        }
      })
    })

    test('returns workorders in the order they appear in the request ids', async () => {
      const server = await createServer()
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [
            testWorkorders.workorder3,
            testWorkorders.workorder1,
            testWorkorders.workorder2
          ]
        },
        url
      })

      const responseResult = /** @type {PostFindWorkordersResponse} */ (
        response.result
      )

      expect(responseResult.data).toHaveLength(3)
      expect(responseResult.data[0].id).toBe(testWorkorders.workorder3)
      expect(responseResult.data[1].id).toBe(testWorkorders.workorder1)
      expect(responseResult.data[2].id).toBe(testWorkorders.workorder2)
      expect(responseResult.links).toEqual({
        self: url,
        next: null,
        prev: null
      })
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
          ids: ['WS-99999']
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

    test('returns workorder with null fields when not present in the data', async () => {
      const server = await createServer()
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10'
      })
      const url = `${path}?${queryParams.toString()}`
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [testWorkorders.workorder3]
        },
        url
      })

      const responseResult = /** @type {PostFindWorkordersResponse} */ (
        response.result
      )
      const record = /** @type {Workorders} */ (responseResult.data[0])

      expect(record.activationDate).toBeNull()
      expect(record.businessArea).toBeNull()
      expect(record.activities).toEqual([])
    })

    test('returns workorders paginated', async () => {
      const server = await createServer()
      const requestIds = [
        testWorkorders.workorder1,
        testWorkorders.workorder2,
        testWorkorders.workorder3
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

      const firstResponseResult = /** @type {PostFindWorkordersResponse} */ (
        firstResponse.result
      )

      expect(firstResponseResult).toEqual({
        data: [expectedWorkordersData.workorder1],
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

      const secondResponseResult = /** @type {PostFindWorkordersResponse} */ (
        secondResponse.result
      )

      expect(secondResponseResult).toEqual({
        data: [expectedWorkordersData.workorder2],
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

      const thirdResponseResult = /** @type {PostFindWorkordersResponse} */ (
        thirdResponse.result
      )

      expect(thirdResponseResult).toEqual({
        data: [expectedWorkordersData.workorder3],
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
      const server = await createServer()
      jest
        .spyOn(executeOperation, 'execute')
        .mockRejectedValueOnce(new Error('Simulated database failure'))

      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['WS-12345']
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
          ids: ['WS-12345']
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
