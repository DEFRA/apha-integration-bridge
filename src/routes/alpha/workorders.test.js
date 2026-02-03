import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import * as route from './workorders.js'
import { first, second } from './workorders.mocks.js'

const path = '/workorders'

describe('Workorders', () => {
  const server = Hapi.server()

  server.route({
    ...route,
    path,
    method: 'GET'
  })

  test('returns the first page of the workorder', async () => {
    const queryParams = new URLSearchParams({
      startActivationDate: new Date('2024-01-01').toISOString(),
      page: '1',
      pageSize: '1',
      endActivationDate: new Date('2030-01-01').toISOString()
    })

    const firstPage = await server.inject({
      method: 'GET',
      url: `/workorders?${queryParams.toString()}`
    })

    const expectedNextParams = new URLSearchParams(queryParams.toString())

    expectedNextParams.set('page', '2')

    expect(firstPage.result).toMatchObject({
      data: [first],
      links: {
        self: `/workorders?${queryParams.toString()}`,
        next: `/workorders?${expectedNextParams.toString()}`
      }
    })

    expect(firstPage.statusCode).toBe(200)

    /**
     * @type {{ links: { next: string; self: string; } }}
     */
    // @ts-expect-error - TypeScript doesn't know about the structure of the response
    const firstPageResponse = firstPage.result

    const secondPage = await server.inject({
      method: 'GET',
      url: firstPageResponse.links.next
    })

    expect(secondPage.result).toMatchObject({
      data: [second],
      links: {
        self: firstPageResponse.links.next,
        prev: firstPageResponse.links.self
      }
    })

    expect(secondPage.statusCode).toBe(200)
  })

  test('returns an empty page', async () => {
    const queryParams = new URLSearchParams({
      startActivationDate: new Date('2024-01-01').toISOString(),
      page: '4',
      pageSize: '1',
      endActivationDate: new Date('2030-01-01').toISOString()
    })

    const emptyPage = await server.inject({
      method: 'GET',
      url: `/workorders?${queryParams.toString()}`
    })

    const prevQueryParams = new URLSearchParams(queryParams.toString())

    prevQueryParams.set('page', String(3))

    expect(emptyPage.result).toMatchObject({
      data: [],
      links: {
        self: `/workorders?${queryParams.toString()}`,
        prev: `/workorders?${prevQueryParams.toString()}`
      }
    })

    expect(emptyPage.statusCode).toBe(200)
  })

  test('returns an empty list if no workorders exist in range', async () => {
    const queryParams = new URLSearchParams({
      startActivationDate: new Date('1924-01-01').toISOString(),
      page: '1',
      pageSize: '1',
      endActivationDate: new Date('1930-01-01').toISOString()
    })
    const res = await server.inject({
      method: 'GET',
      url: `${path}?${queryParams.toString()}`
    })

    expect(res.result).toMatchObject({ data: [] })

    expect(res.statusCode).toBe(200)
  })

  test.each([
    [
      new URLSearchParams({
        pageSize: '1',
        startActivationDate: new Date('1924-01-01').toISOString(),
        endActivationDate: new Date('1930-01-01').toISOString()
      })
    ],
    [
      new URLSearchParams({
        page: '1',
        pageSize: '1',
        endActivationDate: new Date('1930-01-01').toISOString()
      })
    ],
    [
      new URLSearchParams({
        page: '1',
        pageSize: '1',
        startActivationDate: new Date('1924-01-01').toISOString()
      })
    ],
    [
      new URLSearchParams({
        page: '1',
        pageSize: '11',
        startActivationDate: new Date('1924-01-01').toISOString()
      })
    ]
  ])(
    'returns BAD_REQUEST if query parameters are malformed: %s',
    async (queryParams) => {
      const res = await server.inject({
        method: 'GET',
        url: `${path}?${queryParams.toString()}`
      })

      expect(res.statusCode).toBe(400)
    }
  )
})
