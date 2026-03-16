import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import route from './get.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { HTTPException } from '../../lib/http/http-exception.js'
import * as executeOperation from '../../lib/db/operations/execute.js'
import * as getWorkordersOperation from '../../lib/db/queries/get-workorders.js'

const path = '/workorders'

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
    method: 'GET'
  })

  return server
}

describe('GET /workorders', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns paginated workorders with next/prev links', async () => {
    const server = await createServer()

    const pageOneQuery = new URLSearchParams({
      startActivationDate: '2014-05-01T00:00:00.000Z',
      endActivationDate: '2014-07-01T00:00:00.000Z',
      page: '1',
      pageSize: '1'
    })

    const pageOneUrl = `${path}?${pageOneQuery.toString()}`

    const pageOneResponse = await server.inject({
      method: 'GET',
      url: pageOneUrl
    })

    expect(pageOneResponse.statusCode).toBe(200)
    expect(pageOneResponse.result).toMatchObject({
      data: [
        {
          id: 'WS-43',
          type: 'workorders'
        }
      ],
      links: {
        self: pageOneUrl,
        prev: null,
        next: `${path}?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=2&pageSize=1`
      }
    })

    const pageTwoResponse = await server.inject({
      method: 'GET',
      url: /** @type {any} */ (pageOneResponse.result).links.next
    })

    expect(pageTwoResponse.statusCode).toBe(200)
    expect(pageTwoResponse.result).toMatchObject({
      data: [
        {
          id: 'WS-299',
          type: 'workorders'
        }
      ],
      links: {
        self: `${path}?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=2&pageSize=1`,
        prev: pageOneUrl,
        next: `${path}?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=3&pageSize=1`
      }
    })

    const pageThreeResponse = await server.inject({
      method: 'GET',
      url: /** @type {any} */ (pageTwoResponse.result).links.next
    })

    expect(pageThreeResponse.statusCode).toBe(200)
    expect(pageThreeResponse.result).toMatchObject({
      data: [
        {
          id: 'WS-1531',
          type: 'workorders'
        }
      ],
      links: {
        self: `${path}?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=3&pageSize=1`,
        prev: `${path}?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=2&pageSize=1`,
        next: null
      }
    })
  })

  test('returns BAD_REQUEST when endActivationDate is not after startActivationDate', async () => {
    const server = await createServer()

    const query = new URLSearchParams({
      startActivationDate: '2024-02-01T00:00:00.000Z',
      endActivationDate: '2024-01-01T00:00:00.000Z',
      page: '1',
      pageSize: '10'
    })

    const response = await server.inject({
      method: 'GET',
      url: `${path}?${query.toString()}`
    })

    expect(response.statusCode).toBe(400)

    const responseBody = /** @type {Record<string, any>} */ (response.result)

    expect(responseBody.code).toBe('BAD_REQUEST')
    expect(responseBody.errors).toBeDefined()
    expect(responseBody.errors[0].code).toBe('VALIDATION_ERROR')
  })

  test.each([
    [
      '2014-06-24T00:00:00.000Z',
      '2014-06-30T00:00:00.000Z',
      ['WS-299', 'WS-1531']
    ],
    ['2014-06-24T00:00:00.000Z', '2014-06-29T00:00:00.000Z', ['WS-299']],
    ['2014-06-29T00:00:00.000Z', '2014-06-30T00:00:00.000Z', ['WS-1531']]
  ])(
    'filters by activation date range with start=%s and end=%s',
    async (startActivationDate, endActivationDate, expectedWorkorderIds) => {
      const server = await createServer()

      const query = new URLSearchParams({
        startActivationDate,
        endActivationDate,
        page: '1',
        pageSize: '10'
      })

      const url = `${path}?${query.toString()}`
      const response = await server.inject({
        method: 'GET',
        url
      })

      const responseBody = /** @type {Record<string, any>} */ (response.result)
      const returnedWorkorderIds = responseBody.data.map(
        (workorder) => workorder.id
      )

      expect(response.statusCode).toBe(200)
      expect(returnedWorkorderIds).toEqual(expectedWorkorderIds)
      expect(responseBody.links).toEqual({
        self: url,
        next: null,
        prev: null
      })
    }
  )

  test('defaults country filter to Scotland when country is omitted', async () => {
    const server = await createServer()
    const getWorkordersSpy = jest
      .spyOn(getWorkordersOperation, 'getWorkorders')
      .mockResolvedValue({
        hasMore: false,
        workorders: []
      })

    const query = new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: '1',
      pageSize: '10'
    })

    const response = await server.inject({
      method: 'GET',
      url: `${path}?${query.toString()}`
    })

    expect(response.statusCode).toBe(200)
    expect(getWorkordersSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        startActivationDate: '2024-01-01T00:00:00.000Z',
        endActivationDate: '2024-02-01T00:00:00.000Z',
        country: 'Scotland',
        page: 1,
        pageSize: 10
      })
    )
  })

  test('filters by explicit country using case-insensitive input', async () => {
    const server = await createServer()
    const getWorkordersSpy = jest
      .spyOn(getWorkordersOperation, 'getWorkorders')
      .mockResolvedValue({
        hasMore: false,
        workorders: []
      })

    const query = new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      country: 'eNgLaNd',
      page: '1',
      pageSize: '10'
    })

    const response = await server.inject({
      method: 'GET',
      url: `${path}?${query.toString()}`
    })

    expect(response.statusCode).toBe(200)
    expect(getWorkordersSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        startActivationDate: '2024-01-01T00:00:00.000Z',
        endActivationDate: '2024-02-01T00:00:00.000Z',
        country: 'england',
        page: 1,
        pageSize: 10
      })
    )
  })

  test.each([
    ['England', 'WS-76512', ['WS-76513', 'WS-76514']],
    ['Scotland', 'WS-76513', ['WS-76512', 'WS-76514']],
    ['Wales', 'WS-76514', ['WS-76512', 'WS-76513']]
  ])(
    'returns expected seeded %s workorder and excludes seeded workorders from other countries',
    async (country, expectedWorkorderId, excludedWorkorderIds) => {
      const server = await createServer()

      const query = new URLSearchParams({
        startActivationDate: '2024-01-01T00:00:00.000Z',
        endActivationDate: '2024-03-01T00:00:00.000Z',
        country,
        page: '1',
        pageSize: '10'
      })

      const url = `${path}?${query.toString()}`

      const response = await server.inject({
        method: 'GET',
        url
      })

      const responseBody = /** @type {Record<string, any>} */ (response.result)
      const returnedWorkorderIds = []

      for (const workorder of responseBody.data) {
        returnedWorkorderIds.push(workorder.id)
      }

      expect(response.statusCode).toBe(200)
      expect(responseBody.links).toEqual({
        self: url,
        next: null,
        prev: null
      })
      expect(returnedWorkorderIds).toContain(expectedWorkorderId)

      for (const excludedWorkorderId of excludedWorkorderIds) {
        expect(returnedWorkorderIds).not.toContain(excludedWorkorderId)
      }

      for (const workorder of responseBody.data) {
        expect(workorder.country).toBe(country)
      }
    }
  )

  test.each([
    new URLSearchParams({
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: '1',
      pageSize: '10'
    }),
    new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      page: '1',
      pageSize: '10'
    }),
    new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: '0',
      pageSize: '10'
    }),
    new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      country: 'Northern Ireland',
      page: '1',
      pageSize: '10'
    })
  ])('validates malformed query parameters: %s', async (query) => {
    const server = await createServer()

    const response = await server.inject({
      method: 'GET',
      url: `${path}?${query.toString()}`
    })

    expect(response.statusCode).toBe(400)
  })

  test('wraps non-HTTPException errors into INTERNAL_SERVER_ERROR', async () => {
    const server = await createServer()

    jest
      .spyOn(executeOperation, 'execute')
      .mockRejectedValueOnce(new Error('Simulated database failure'))

    const query = new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: '1',
      pageSize: '10'
    })

    const response = await server.inject({
      method: 'GET',
      url: `${path}?${query.toString()}`
    })

    expect(response.statusCode).toBe(500)

    const responseBody = /** @type {Record<string, any>} */ (response.result)

    expect(responseBody.code).toBe('INTERNAL_SERVER_ERROR')
    expect(responseBody.errors).toBeDefined()
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

    const query = new URLSearchParams({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: '1',
      pageSize: '10'
    })

    const response = await server.inject({
      method: 'GET',
      url: `${path}?${query.toString()}`
    })

    expect(response.statusCode).toBe(400)

    const responseBody = /** @type {Record<string, any>} */ (response.result)

    expect(responseBody.code).toBe('BAD_REQUEST')
    expect(responseBody.message).toBe(
      'Deliberate HTTP exception from mocked execute'
    )
  })
})
