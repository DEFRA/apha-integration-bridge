import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import route from './locations.js'
import { holdingLocations } from './locations.mocks.js'

const path = '/holdings/{countyId}/{parishId}/{holdingId}/locations'

describe('holdings/{countyId}/{parishId}/{holdingId}/locations', () => {
  const server = Hapi.server()

  server.route({
    ...route,
    path
  })

  test.each(Object.entries(holdingLocations))(
    'returns the locations of %s',
    async (cph, data) => {
      const url = `/holdings/${cph}/locations`
      const response = await server.inject({ method: 'GET', url })

      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({ data, links: { self: url } })
    }
  )

  test('returns 404 for a CPH with no mock data', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/99/999/9999/locations'
    })

    expect(response.statusCode).toBe(404)
    expect(JSON.parse(response.payload)).toEqual({
      message: 'Holding not found or inactive',
      code: 'NOT_FOUND',
      errors: []
    })
  })
})
