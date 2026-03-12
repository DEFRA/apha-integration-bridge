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

    test('fails validation when workorder ID format is not WS-#####', async () => {
      const server = await createServer()
      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: ['ABC-12345']
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
        activationDate: '2024-01-07',
        businessArea: 'Endemic Notifiable Disease',
        workArea: 'Tuberculosis',
        country: 'England',
        aim: 'Contain / Control / Eradicate Endemic Disease',
        purpose: 'Initiate Incident Premises Spread Tracing Action',
        earliestActivityStartDate: '01/01/2024 09:00:00',
        species: 'Cattle',
        activities: [],
        phase: 'EXPOSURETRACKING',
        relationships: {
          customerOrOrganisation: {
            data: {
              id: 'C123456',
              type: 'customers'
            }
          },
          holding: {
            data: {
              id: '01/001/0001',
              type: 'holdings'
            }
          },
          facilities: {
            data: []
          },
          location: {
            data: {
              id: 'LOC-ALPHA',
              type: 'locations'
            }
          },
          livestockUnits: {
            data: [
              {
                id: 'U000010',
                type: 'animal-commodities'
              }
            ]
          }
        }
      },
      workorder2: {
        type: 'workorders',
        id: 'WS-76513',
        activationDate: '2024-01-06',
        businessArea: 'Endemic Notifiable Disease',
        workArea: 'Tuberculosis',
        country: 'Scotland',
        aim: 'Contain / Control / Eradicate Endemic Disease',
        purpose: 'Initiate Incident Premises Spread Tracing Action',
        earliestActivityStartDate: '03/01/2024 09:00:00',
        species: 'Sheep',
        activities: [
          {
            type: 'activities',
            id: 'WS-76513-ACT1',
            activityName: 'Arrange Visit',
            sequenceNumber: 1
          },
          {
            type: 'activities',
            id: 'WS-76513-ACT2',
            activityName: 'Perform TB Skin Test',
            sequenceNumber: 2
          }
        ],
        phase: 'EXPOSURETRACKING',
        relationships: {
          customerOrOrganisation: {
            data: {
              id: 'O123456',
              type: 'organisations'
            }
          },
          holding: {
            data: {
              id: '45/001/0002',
              type: 'holdings'
            }
          },
          facilities: {
            data: [
              {
                id: 'U000030',
                type: 'facilities'
              }
            ]
          },
          location: {
            data: {
              id: 'LOC-BETA',
              type: 'locations'
            }
          },
          livestockUnits: {
            data: [
              {
                id: 'U000020',
                type: 'animal-commodities'
              }
            ]
          }
        }
      },
      workorder3: {
        type: 'workorders',
        id: 'WS-76514',
        activationDate: '2024-02-10',
        businessArea: 'Animal Health and Welfare',
        workArea: 'General Inspection',
        country: 'Wales',
        aim: 'Ensure Compliance with Animal Health Standards',
        purpose: 'Routine Inspection and Disease Monitoring',
        earliestActivityStartDate: '08/02/2024 08:00:00',
        species: 'Cattle',
        activities: [
          {
            activityName: 'Initial Farm Assessment',
            id: 'WS-76514-ACT1',
            sequenceNumber: 1,
            type: 'activities'
          },
          {
            activityName: 'Livestock Document Review',
            id: 'WS-76514-ACT2',
            sequenceNumber: 2,
            type: 'activities'
          },
          {
            activityName: 'Physical Animal Inspection',
            id: 'WS-76514-ACT3',
            sequenceNumber: 3,
            type: 'activities'
          }
        ],
        phase: 'INSPECTION',
        relationships: {
          customerOrOrganisation: {
            data: {
              id: 'C789012',
              type: 'customers'
            }
          },
          holding: {
            data: {
              id: '01/409/1111',
              type: 'holdings'
            }
          },
          facilities: {
            data: []
          },
          location: {
            data: {
              id: 'LOC-OMEGA',
              type: 'locations'
            }
          },
          livestockUnits: {
            data: [
              {
                id: 'U000010',
                type: 'animal-commodities'
              },
              {
                id: 'U000020',
                type: 'animal-commodities'
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
          ids: [
            testWorkorders.workorder1,
            testWorkorders.workorder2,
            testWorkorders.workorder3
          ]
        },
        url
      })

      expect(response.result).toEqual({
        data: [
          expectedWorkordersData.workorder1,
          expectedWorkordersData.workorder2,
          expectedWorkordersData.workorder3
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
          ids: [testWorkorders.workorder1]
        },
        url
      })

      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({
        data: [],
        links: {
          self: url,
          next: null,
          prev: '/workorders/find?page=1&pageSize=10'
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
