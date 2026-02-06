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

  const res = await server.inject({ method: 'GET', url: '/L97339' })

  const body = /** @type {Record<string, any>} */ (res.result)

  expect(res.statusCode).toBe(200)

  // Basic identity
  expect(body).toMatchObject({
    data: {
      type: 'locations',
      id: 'L97339'
    },
    links: {
      self: '/L97339'
    }
  })

  // Address fields seeded in the test schema
  expect(body.data.address).toMatchObject({
    paonStartNumber: 12,
    paonDescription: 'Willow Barn',
    street: 'Farm Lane',
    locality: 'Westham',
    town: 'Exampletown',
    administrativeAreaCounty: 'Devon',
    postcode: 'EX1 2AB',
    ukInternalCode: 'UKX123',
    countryCode: 'GB'
  })

  // Relationships: two commodities (array) and one facility (array)
  const rel = body.data.relationships

  expect(Array.isArray(rel.commodities)).toBe(true)
  expect(rel.commodities).toEqual(
    expect.arrayContaining([
      {
        data: { type: 'commodities', id: 'U000010' }
      },
      {
        data: { type: 'commodities', id: 'U000020' }
      }
    ])
  )

  expect(rel.facilities).toMatchObject({
    data: { type: 'facilities', id: 'U000030' }
  })
})
