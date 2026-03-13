import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import route from './get.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { HTTPException } from '../../lib/http/http-exception.js'
import * as executeOperation from '../../lib/db/operations/execute.js'
import * as paginateWorkordersOperation from '../../lib/db/queries/paginate-workorders.js'

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

  test('defaults country filter to Scotland when country is omitted', async () => {
    const server = await createServer()
    const paginateWorkordersSpy = jest
      .spyOn(paginateWorkordersOperation, 'paginateWorkorders')
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
    expect(paginateWorkordersSpy).toHaveBeenCalledWith(
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
    const paginateWorkordersSpy = jest
      .spyOn(paginateWorkordersOperation, 'paginateWorkorders')
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
    expect(paginateWorkordersSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        startActivationDate: '2024-01-01T00:00:00.000Z',
        endActivationDate: '2024-02-01T00:00:00.000Z',
        country: 'eNgLaNd',
        page: 1,
        pageSize: 10
      })
    )
  })

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
