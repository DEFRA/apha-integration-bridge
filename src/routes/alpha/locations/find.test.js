import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import route from './find.js'
import { location1, location2 } from './find.mocks.js'

const path = '/locations/find'

describe('locations/find', () => {
  const server = Hapi.server()

  server.route({
    ...route,
    path,
    method: 'POST'
  })

  test('returns all matching ids', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`
    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [location1.id, location2.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [location1, location2],
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
        ids: ['missing', 'id']
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

  test('returns holdings in order requested', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`
    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [location2.id, location1.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [location2, location1],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns holdings paginated', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '1'
    })
    const url = `${path}?${queryParams.toString()}`
    const firstResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [location2.id, location1.id]
      },
      url
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())
    nextQueryParams.set('page', '2')

    expect(firstResponse.result).toEqual({
      data: [location2],
      links: {
        self: url,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [location2.id, location1.id]
      },
      url: firstResponse.result.links.next
    })

    expect(secondResponse.result).toEqual({
      data: [location1],
      links: {
        self: `${path}?${nextQueryParams.toString()}`,
        next: null,
        prev: url
      }
    })
  })
})
