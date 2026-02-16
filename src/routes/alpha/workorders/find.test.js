import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import route from './find.js'
import { workorder1, workorder2 } from '../workorders.mocks.js'

const path = '/workorders/find'

describe('workorders/find', () => {
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
        ids: [workorder1.id, workorder2.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [workorder1, workorder2],
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

  test('returns workorders in order requested', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`
    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [workorder2.id, workorder1.id]
      },
      url
    })

    expect(response.result).toEqual({
      data: [workorder2, workorder1],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns workorders paginated', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '1'
    })
    const url = `${path}?${queryParams.toString()}`
    const firstResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [workorder2.id, workorder1.id]
      },
      url
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())
    nextQueryParams.set('page', '2')

    expect(firstResponse.result).toEqual({
      data: [workorder2],
      links: {
        self: url,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [workorder2.id, workorder1.id]
      },
      url: firstResponse.result.links.next
    })

    expect(secondResponse.result).toEqual({
      data: [workorder1],
      links: {
        self: `${path}?${nextQueryParams.toString()}`,
        next: null,
        prev: url
      }
    })
  })
})
