import Hapi from '@hapi/hapi'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'

import { mask } from '../../lib/pii/index.js'
import { piiContextPlugin } from './pii-context.js'

/**
 * @typedef {import('@hapi/hapi').Request & { app: { scopes?: string[] }}} HapiRequestWithScopes
 */

const buildServer = async () => {
  const server = Hapi.server()

  server.ext({
    type: 'onPostAuth',
    /**
     * @param {HapiRequestWithScopes} request
     */
    method: (request, h) => {
      const header = request.headers['x-scopes']

      if (typeof header === 'string') {
        request.app.scopes = header ? header.split(',') : []
      }

      return h.continue
    }
  })

  await server.register(piiContextPlugin)

  server.route({
    method: 'GET',
    path: '/probe',
    handler: async () => {
      // Force at least one async tick so we exercise async-context propagation.
      await new Promise((resolve) => setImmediate(resolve))

      return { value: mask('John Smith') }
    }
  })

  await server.initialize()

  return server
}

describe('piiContextPlugin', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeEach(async () => {
    server = await buildServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('masks by default when scopes are not populated', async () => {
    const res = await server.inject({ method: 'GET', url: '/probe' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'J********h' })
  })

  test('masks when scopes are populated but do not include pii', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-scopes': 'other' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'J********h' })
  })

  test('does not mask when scopes include pii', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-scopes': 'pii' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'John Smith' })
  })

  test('does not mask when scopes include pii alongside other scopes', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { 'x-scopes': 'other,pii,admin' }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ value: 'John Smith' })
  })

  test('concurrent requests do not leak masking context across each other', async () => {
    const [unmasked, masked] = await Promise.all([
      server.inject({
        method: 'GET',
        url: '/probe',
        headers: { 'x-scopes': 'pii' }
      }),
      server.inject({ method: 'GET', url: '/probe' })
    ])

    expect(unmasked.result).toEqual({ value: 'John Smith' })

    expect(masked.result).toEqual({ value: 'J********h' })
  })
})
