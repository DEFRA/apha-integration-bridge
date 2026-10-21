import Hapi from '@hapi/hapi'
import { test, expect, jest } from '@jest/globals'
import hapiPino from 'hapi-pino'
import { clientScopesPlugin } from '../../common/helpers/client-scopes.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { piiContextPlugin } from '../../common/helpers/pii-context.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'

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
    locality: 'Test Locality',
    town: 'Test Town',
    postcode: 'TE1 1ST'
  })

  expect(body.data.address.administrativeAreaCounty).toBe('Test County')

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

  // The location fields `POST /locations/find` also returns
  expect(body.data).toMatchObject({
    name: 'Test Farm Location',
    status: { code: 'ACTIVE', reasonCode: null, since: '2008-01-01T00:00:00Z' },
    position: {
      easting: 412345,
      northing: 323456,
      osMapReference: 'SK123456',
      pointType: 'CENTROID'
    }
  })
  expect(body.data.subLocations.map((s) => s.id)).toEqual(['97001', '97002'])
  expect(rel.holdings.data).toEqual([{ type: 'holdings', id: '98/001/0001' }])
})

test('returns an empty sub-location list for a location without sub-locations', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    oracleDb
  ])

  registerSimpleAuthStrategy(server)

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{locationId}',
    method: 'GET'
  })

  const res = await server.inject({ method: 'GET', url: '/L98002' })

  const body = /** @type {Record<string, any>} */ (res.result)

  expect(res.statusCode).toBe(200)
  expect(body.data.subLocations).toEqual([])
  expect(body.data.relationships.holdings.data).toEqual([
    { type: 'holdings', id: '98/002/0001' }
  ])
})

test('returns the error envelope and logs when the database is unavailable', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register({
    plugin: hapiPino,
    options: {
      enabled: false
    }
  })

  // Stand-in for the oracledb plugin's decoration: the connection request
  // rejects, driving the handler's catch block.
  server.decorate('server', 'oracledb.sam', () =>
    Promise.reject(new Error('connection refused'))
  )

  // Spy on request.logger.error to prove the catch block logs
  // unconditionally now that the logger guard is gone.
  const errorSpy = jest.fn()

  server.ext('onPreHandler', (request, h) => {
    request.logger = /** @type {any} */ ({
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: errorSpy
    })
    return h.continue
  })

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

  expect(res.statusCode).toBe(500)
  expect(res.result).toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    errors: [
      {
        code: 'DATABASE_ERROR'
      }
    ]
  })
  expect(errorSpy).toHaveBeenCalled()
})

test('masks the names and every free-text address field, including locality and county, without the pii scope', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    },
    piiContextPlugin
  ])

  server.decorate('server', 'oracledb.sam', async () => ({
    connection: {
      // a shed for the sub-location query, the location for the other
      execute: async (sql) => ({
        rows: sql.includes('SUB_LOCATION')
          ? [
              {
                premises_feature_pk: 91001,
                feature_pk: 97001,
                feature_name: 'Shed 1',
                sub_location_type: 'BROILERSHED',
                feature_status_code: 'COMPLETE',
                feature_state_from_dttm: new Date(Date.UTC(2015, 2, 1))
              }
            ]
          : [
              {
                location_id: 'L98001',
                feature_pk: 91001,
                feature_name: 'Test Farm Location',
                feature_status_code: 'ACTIVE',
                feature_state_from_dttm: new Date(Date.UTC(2008, 0, 1)),
                street: 'Test Street',
                locality: 'Test Locality',
                town: 'Test Town',
                county: 'Test County',
                postcode: 'TE1 1ST',
                uk_internal_code: 'England',
                country_code: 'GB',
                unit_id: 'N/A',
                unit_type: 'N/A'
              }
            ]
      })
    },
    [Symbol.asyncDispose]: async () => {}
  }))

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
  expect(body.data.address).toMatchObject({
    street: 'T*********t', // Test Street
    locality: 'T***********y', // Test Locality
    town: 'T*******n', // Test Town
    administrativeAreaCounty: 'T*********y', // Test County
    postcode: 'T*****T', // TE1 1ST
    ukInternalCode: 'England',
    countryCode: 'GB'
  })
  expect(body.data.name).toBe('T****************n') // Test Farm Location
  expect(body.data.subLocations.map((s) => s.name)).toEqual(['S****1']) // Shed 1
})

test('returns the names and every address field unmasked to a client with the pii scope', async () => {
  const server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    {
      plugin: clientScopesPlugin,
      options: { clientsScopes: [{ client_id: 'pii-client', scopes: ['pii'] }] }
    },
    piiContextPlugin,
    oracleDb
  ])

  registerSimpleAuthStrategy(server, { clientId: 'pii-client' })

  server.route({
    handler: route.handler,
    options: route.options,
    path: '/{locationId}',
    method: 'GET'
  })

  const res = await server.inject({ method: 'GET', url: '/L98001' })

  const body = /** @type {Record<string, any>} */ (res.result)

  expect(res.statusCode).toBe(200)
  expect(body.data.name).toBe('Test Farm Location')
  expect(body.data.subLocations.map((s) => s.name)).toEqual([
    'Shed 1',
    'Top Field'
  ])
  expect(body.data.address).toMatchObject({
    street: 'Test Street',
    locality: 'Test Locality',
    town: 'Test Town',
    administrativeAreaCounty: 'Test County',
    postcode: 'TE1 1ST'
  })
})
