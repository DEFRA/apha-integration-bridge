import Hapi from '@hapi/hapi'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'

import { mask } from '../../lib/pii/index.js'
import { clientScopesPlugin, findScopesForClient } from './client-scopes.js'
import { piiContextPlugin } from './pii-context.js'

/**
 * @typedef {import('../../types/api.js').HapiRequestWithScopes} HapiRequestWithScopes
 */

describe('findScopesForClient', () => {
  test('returns [] for nullish clientId', () => {
    const clientsScopes = [{ client_id: 'abc', scopes: ['pii'] }]

    expect(findScopesForClient(undefined, clientsScopes)).toEqual([])

    expect(findScopesForClient(null, clientsScopes)).toEqual([])

    expect(findScopesForClient('', clientsScopes)).toEqual([])
  })

  test('returns [] when no entry matches', () => {
    const clientsScopes = [{ client_id: 'abc', scopes: ['pii'] }]

    expect(findScopesForClient('xyz', clientsScopes)).toEqual([])
  })

  test('returns the matching entry scopes', () => {
    const clientsScopes = [
      { client_id: 'abc', scopes: ['pii'] },
      { client_id: 'def', scopes: ['pii'] }
    ]

    expect(findScopesForClient('abc', clientsScopes)).toEqual(['pii'])
  })

  test('unions scopes across multiple matching entries', () => {
    const clientsScopes = [
      { client_id: 'abc', scopes: ['pii'] },
      { client_id: 'abc', scopes: ['write'] }
    ]

    expect(findScopesForClient('abc', clientsScopes).sort()).toEqual(
      ['pii', 'write'].sort()
    )
  })

  test('returns [] for an empty client scopes list', () => {
    expect(findScopesForClient('abc', [])).toEqual([])
  })
})

const clientsScopes = [
  { client_id: 'pii-client', scopes: ['pii'] },
  { client_id: 'write-client', scopes: ['write'] }
]

const buildServer = async () => {
  const server = Hapi.server()

  server.auth.scheme('stub-bearer', () => ({
    authenticate: (request, h) => {
      const clientId = request.headers['x-client-id']

      if (!clientId) {
        return h.unauthenticated(new Error('no client id'), {
          credentials: {},
          artifacts: {}
        })
      }

      return h.authenticated({
        credentials: { token: 'stub' },
        artifacts: { client_id: clientId }
      })
    }
  }))

  server.auth.strategy('stub', 'stub-bearer')

  await server.register({
    plugin: clientScopesPlugin,
    options: { clientsScopes }
  })

  server.route({
    method: 'GET',
    path: '/probe',
    options: { auth: 'stub' },
    handler: (/** @type {HapiRequestWithScopes} */ request) => ({
      scopes: request.app.scopes
    })
  })

  server.route({
    method: 'GET',
    path: '/no-auth',
    options: { auth: false },
    handler: (/** @type {HapiRequestWithScopes} */ request) => ({
      scopes: request.app.scopes
    })
  })

  await server.initialize()
  return server
}

describe('clientScopesPlugin', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeEach(async () => {
    server = await buildServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('exposes scopes for a recognised client', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'pii-client' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ scopes: ['pii'] })
  })

  test('exposes write scope for a write-only recognised client', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'write-client' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ scopes: ['write'] })
  })

  test('exposes [] for an unknown client', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'unknown' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ scopes: [] })
  })

  test('exposes [] for routes without authentication', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/no-auth'
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ scopes: [] })
  })
})

const buildIntegrationServer = async () => {
  const server = Hapi.server()

  server.auth.scheme('stub-bearer', () => ({
    authenticate: (request, h) => {
      const clientId = request.headers['x-client-id']

      if (!clientId) {
        return h.unauthenticated(new Error('no client id'), {
          credentials: {},
          artifacts: {}
        })
      }

      return h.authenticated({
        credentials: { token: 'stub' },
        artifacts: { client_id: clientId }
      })
    }
  }))

  server.auth.strategy('stub', 'stub-bearer')

  await server.register([
    {
      plugin: clientScopesPlugin,
      options: { clientsScopes }
    },
    piiContextPlugin
  ])

  server.route({
    method: 'GET',
    path: '/probe',
    options: { auth: 'stub' },
    handler: async () => {
      // Force at least one async tick so we exercise async-context propagation.
      await new Promise((resolve) => setImmediate(resolve))

      return { value: mask('John Smith') }
    }
  })

  server.route({
    method: 'GET',
    path: '/no-auth',
    options: { auth: false },
    handler: async () => {
      await new Promise((resolve) => setImmediate(resolve))

      return { value: mask('John Smith') }
    }
  })

  await server.initialize()
  return server
}

describe('clientScopesPlugin + piiContextPlugin (integration)', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeEach(async () => {
    server = await buildIntegrationServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('returns unmasked PII when the client has the pii scope', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'pii-client' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'John Smith' })
  })

  test('masks PII when the client is recognised but lacks the pii scope', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'write-client' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'J********h' })
  })

  test('masks PII when the client is unknown', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'unknown' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'J********h' })
  })

  test('masks PII for routes without authentication', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/no-auth'
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'J********h' })
  })

  test('concurrent requests do not leak masking state across each other', async () => {
    const [unmasked, masked] = await Promise.all([
      server.inject({
        method: 'GET',
        url: '/probe',
        headers: { 'x-client-id': 'pii-client' }
      }),
      server.inject({
        method: 'GET',
        url: '/probe',
        headers: { 'x-client-id': 'write-client' }
      })
    ])

    expect(unmasked.result).toEqual({ value: 'John Smith' })

    expect(masked.result).toEqual({ value: 'J********h' })
  })
})
