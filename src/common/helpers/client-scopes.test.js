import Hapi from '@hapi/hapi'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'

import { mask } from '../../lib/pii/index.js'
import { clientScopesPlugin, findScopesForClient } from './client-scopes.js'
import { piiContextPlugin } from './pii-context.js'

/**
 * @typedef {import('@hapi/hapi').Request & { app: { scopes?: string[] }}} HapiRequestWithScopes
 */

describe('findScopesForClient', () => {
  test('returns [] for nullish clientId', () => {
    const clients = { wfm: { client_ids: ['abc'], scopes: ['pii'] } }

    expect(findScopesForClient(undefined, clients)).toEqual([])

    expect(findScopesForClient(null, clients)).toEqual([])

    expect(findScopesForClient('', clients)).toEqual([])
  })

  test('returns [] when no entry matches', () => {
    const clients = { wfm: { client_ids: ['abc'], scopes: ['pii'] } }

    expect(findScopesForClient('xyz', clients)).toEqual([])
  })

  test('returns the matching entry scopes', () => {
    const clients = {
      wfm: { client_ids: ['abc', 'def'], scopes: ['pii', 'admin'] }
    }

    expect(findScopesForClient('abc', clients)).toEqual(['pii', 'admin'])
  })

  test('unions scopes across multiple matching entries', () => {
    const clients = {
      legacy: { client_ids: ['abc'], scopes: ['legacy-scope'] },
      wfm: { client_ids: ['abc'], scopes: ['pii'] }
    }

    expect(findScopesForClient('abc', clients).sort()).toEqual(
      ['legacy-scope', 'pii'].sort()
    )
  })

  test('returns [] for an empty clients config', () => {
    expect(findScopesForClient('abc', {})).toEqual([])
  })
})

const clients = {
  wfm: { client_ids: ['pii-client'], scopes: ['pii'] },
  legacy: { client_ids: ['no-pii-client'], scopes: ['other'] }
}

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
    options: { clients }
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

  test('exposes scopes for a non-pii recognised client', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-client-id': 'no-pii-client' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ scopes: ['other'] })
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
      options: { clients }
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
      headers: { 'x-client-id': 'no-pii-client' }
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
        headers: { 'x-client-id': 'no-pii-client' }
      })
    ])

    expect(unmasked.result).toEqual({ value: 'John Smith' })

    expect(masked.result).toEqual({ value: 'J********h' })
  })
})
