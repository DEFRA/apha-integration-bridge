import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'

import { errorEnvelope } from './error-envelope.js'
import { HTTPException, HTTPError } from '../../lib/http/http-exception.js'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 */

describe('errorEnvelope plugin', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = Hapi.server({ port: 0 })

    await server.register(errorEnvelope)

    server.route([
      {
        method: 'GET',
        path: '/ok',
        handler: () => ({ value: 42 })
      },
      {
        method: 'POST',
        path: '/json',
        handler: () => ({ value: 'parsed' })
      },
      {
        method: 'GET',
        path: '/boom-bad-request',
        handler: () => {
          throw Boom.badRequest('Invalid request payload JSON format')
        }
      },
      {
        method: 'GET',
        path: '/boom-unauthorized',
        handler: () => {
          throw Boom.unauthorized('Authentication failed')
        }
      },
      {
        method: 'GET',
        path: '/boom-unauthorized-no-message',
        handler: () => {
          throw Boom.unauthorized()
        }
      },
      {
        method: 'GET',
        path: '/boom-unauthorized-scheme',
        handler: () => {
          throw Boom.unauthorized('Authentication failed', 'Bearer')
        }
      },
      {
        method: 'GET',
        path: '/boom-forbidden',
        handler: () => {
          throw Boom.forbidden('Insufficient permissions')
        }
      },
      {
        method: 'GET',
        path: '/boom-teapot',
        handler: () => {
          throw new Boom.Boom('short and stout', { statusCode: 418 })
        }
      },
      {
        method: 'GET',
        path: '/throws-http-exception',
        handler: () => {
          throw new HTTPException('BAD_REQUEST', 'Bad thing happened', [
            new HTTPError('VALIDATION_ERROR', 'a field is wrong')
          ])
        }
      },
      {
        method: 'GET',
        path: '/returns-http-exception',
        handler: () =>
          new HTTPException('NOT_FOUND', 'Nothing here', [
            new HTTPError('CASE_NOT_FOUND', 'case 1 not found')
          ])
      },
      {
        method: 'GET',
        path: '/returns-boomified-http-exception',
        handler: () =>
          new HTTPException('DUPLICATE_RESOURCES_FOUND', 'Already exists', [
            new HTTPError('DATABASE_ERROR', 'duplicate key')
          ]).boomify()
      },
      {
        method: 'GET',
        path: '/throws-generic-error',
        handler: () => {
          throw new Error('super secret internal detail')
        }
      },
      {
        method: 'GET',
        path: '/throws-http-exception-500',
        handler: () => {
          throw new HTTPException(
            'INTERNAL_SERVER_ERROR',
            'Error communicating with Cognito: ENOTFOUND secret-host',
            [new HTTPError('DATABASE_ERROR', 'connection refused to 10.0.0.5')]
          )
        }
      },
      {
        method: 'GET',
        path: '/boom-service-unavailable',
        handler: () => {
          throw Boom.serverUnavailable('database pool exhausted on host-secret')
        }
      },
      {
        method: 'GET',
        path: '/boom-bad-implementation',
        handler: () => {
          throw Boom.badImplementation('null pointer in secret module')
        }
      }
    ])
  })

  afterAll(async () => {
    await server.stop()
  })

  test('passes through successful responses untouched', async () => {
    const res = await server.inject({ method: 'GET', url: '/ok' })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual({ value: 42 })
  })

  test('normalises a generic Boom 4xx into the envelope', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/boom-bad-request'
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request payload JSON format',
      code: 'BAD_REQUEST',
      errors: []
    })
  })

  test('normalises malformed JSON request bodies into the envelope', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/json',
      headers: { 'content-type': 'application/json' },
      payload: '{ "broken": '
    })

    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.payload)

    expect(body.code).toBe('BAD_REQUEST')
    expect(Array.isArray(body.errors)).toBe(true)
    expect(typeof body.message).toBe('string')
    expect(body).not.toHaveProperty('statusCode')
    expect(body).not.toHaveProperty('error')
  })

  test('normalises an unauthorized error and preserves its message', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/boom-unauthorized'
    })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Authentication failed',
      code: 'UNAUTHORIZED',
      errors: []
    })
  })

  test('falls back to the Boom error label when no message is present', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/boom-unauthorized-no-message'
    })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      errors: []
    })
  })

  test('normalises a forbidden error into the envelope', async () => {
    const res = await server.inject({ method: 'GET', url: '/boom-forbidden' })

    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Insufficient permissions',
      code: 'FORBIDDEN',
      errors: []
    })
  })

  test('preserves the status code for unmapped Boom statuses', async () => {
    const res = await server.inject({ method: 'GET', url: '/boom-teapot' })

    expect(res.statusCode).toBe(418)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'short and stout',
      code: 'BAD_REQUEST',
      errors: []
    })
  })

  test('preserves response headers when normalising auth errors', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/boom-unauthorized-scheme'
    })

    // Boom.unauthorized with a scheme attaches a WWW-Authenticate header that
    // must survive the payload rewrite.
    expect(res.statusCode).toBe(401)
    expect(res.headers).toHaveProperty('www-authenticate')
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Authentication failed',
      code: 'UNAUTHORIZED',
      errors: []
    })
  })

  test('restores a thrown raw HTTPException to its intended status and shape', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/throws-http-exception'
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Bad thing happened',
      code: 'BAD_REQUEST',
      errors: [{ code: 'VALIDATION_ERROR', message: 'a field is wrong' }]
    })
  })

  test('restores a returned raw HTTPException to its intended status and shape', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/returns-http-exception'
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Nothing here',
      code: 'NOT_FOUND',
      errors: [{ code: 'CASE_NOT_FOUND', message: 'case 1 not found' }]
    })
  })

  test('leaves an already-boomified HTTPException unchanged', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/returns-boomified-http-exception'
    })

    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Already exists',
      code: 'DUPLICATE_RESOURCES_FOUND',
      errors: [{ code: 'DATABASE_ERROR', message: 'duplicate key' }]
    })
  })

  test('normalises an unexpected 500 without leaking internal details', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/throws-generic-error'
    })

    expect(res.statusCode).toBe(500)

    const body = JSON.parse(res.payload)

    expect(body).toEqual({
      message: 'An internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      errors: []
    })
    expect(res.payload).not.toContain('super secret internal detail')
  })

  test('sanitises the message of a 5xx HTTPException but keeps code and errors', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/throws-http-exception-500'
    })

    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'An internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      errors: [
        { code: 'DATABASE_ERROR', message: 'connection refused to 10.0.0.5' }
      ]
    })
    // The developer-interpolated upstream detail must never reach the client.
    expect(res.payload).not.toContain('ENOTFOUND secret-host')
  })

  test('sanitises an explicit 5xx Boom message that Boom leaves untouched', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/boom-service-unavailable'
    })

    expect(res.statusCode).toBe(503)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'An internal server error occurred',
      code: 'SERVICE_UNAVAILABLE',
      errors: []
    })
    expect(res.payload).not.toContain('database pool exhausted')
  })

  test('normalises a Boom.badImplementation into the envelope', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/boom-bad-implementation'
    })

    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'An internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      errors: []
    })
    expect(res.payload).not.toContain('null pointer in secret module')
  })
})
