import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import route from './find.js'
import { organisation1, organisation2 } from './find.mocks.js'

const path = '/organisations/find'

describe('organisations/find', () => {
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
        ids: [organisation1.id, organisation2.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [organisation1, organisation2],
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

  test('returns organisations in order requested', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`
    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisation2.id, organisation1.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [organisation2, organisation1],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns organisations paginated', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '1'
    })
    const url = `${path}?${queryParams.toString()}`
    const firstResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisation2.id, organisation1.id]
      },
      url
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())
    nextQueryParams.set('page', '2')

    expect(firstResponse.result).toEqual({
      data: [organisation2],
      links: {
        self: url,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisation2.id, organisation1.id]
      },
      url: firstResponse.result.links.next
    })

    expect(secondResponse.result).toEqual({
      data: [organisation1],
      links: {
        self: `${path}?${nextQueryParams.toString()}`,
        next: null,
        prev: url
      }
    })
  })
})
