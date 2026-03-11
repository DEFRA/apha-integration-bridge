import Hapi from '@hapi/hapi'
import { test, expect } from '@jest/globals'
import hapiPino from 'hapi-pino'
import { oracleDb } from '../../common/helpers/oracledb.js'

import * as route from './{locationId}.js'

test('returns the location, address and related units for a known Location ID', async () => {
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

  // simple auth strategy to satisfy route auth requirements
  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => h.authenticated({ credentials: {} })
    }
  })

  server.auth.strategy('simple', 'simple', {})
  server.auth.default('simple')

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{locationId}',
    method: 'GET'
  })

  const res = await server.inject({ method: 'GET', url: '/L98001' })

  const body = /** @type {Record<string, any>} */ (res.result)

  expect(res.statusCode).toBe(200)

  // Basic identity
  expect(body).toMatchObject({
    data: {
      type: 'locations',
      id: 'L98001'
    },
    links: {
      self: '/L98001'
    }
  })

  // Address fields seeded in the test schema
  expect(body.data.address).toMatchObject({
    street: 'Test Street',
    town: 'Test Town',
    postcode: 'TE1 1ST'
  })

  // Check primary addressable object if present
  if (body.data.address.primaryAddressableObject) {
    expect(body.data.address.primaryAddressableObject.startNumber).toBe(123)
  }

  // Relationships: one commodity (livestock unit) and one facility
  const rel = body.data.relationships

  expect(Array.isArray(rel.commodities.data)).toBe(true)
  expect(rel.commodities.data).toEqual(
    expect.arrayContaining([
      {
        type: 'commodities',
        id: 'LU98001001'
      }
    ])
  )

  expect(rel.facilities.data).toEqual([{ type: 'facilities', id: 'F98001001' }])
})
