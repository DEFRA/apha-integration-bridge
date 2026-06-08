import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

import { createServer } from '../../server.js'

/**
 * End-to-end coverage proving the errorEnvelope plugin normalises errors when
 * wired into the real server (registered alongside the auth scheme and every
 * other plugin), not just in isolation. Route unit tests build their own
 * minimal servers without errorEnvelope, so this is the only place the auth ->
 * errorEnvelope pipeline is exercised together.
 *
 * @typedef {import('@hapi/hapi').Server} Server
 */
describe('error envelope (integration via createServer)', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('normalises auth failures on protected routes into the envelope', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/customers/find',
      payload: { ids: ['C123456'] }
    })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Authentication failed',
      code: 'UNAUTHORIZED',
      errors: []
    })
  })
})
