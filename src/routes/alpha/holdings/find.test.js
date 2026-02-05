import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import route from './find.js'
import { holding1, holding2 } from './find.mocks.js'

const path = '/holdings/find'

describe('holdings/find', () => {
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
        ids: [holding1.id, holding2.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [holding1, holding2],
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
        ids: [holding2.id, holding1.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [holding2, holding1],
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
        ids: [holding2.id, holding1.id]
      },
      url
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())
    nextQueryParams.set('page', '2')

    expect(firstResponse.result).toEqual({
      data: [holding2],
      links: {
        self: url,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [holding2.id, holding1.id]
      },
      url: firstResponse.result.links.next
    })

    expect(secondResponse.result).toEqual({
      data: [holding1],
      links: {
        self: `${path}?${nextQueryParams.toString()}`,
        next: null,
        prev: url
      }
    })
  })
})
