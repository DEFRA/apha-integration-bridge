import {
  jest,
  describe,
  beforeAll,
  afterAll,
  test,
  expect
} from '@jest/globals'
import Hapi from '@hapi/hapi'
import path from 'node:path'

import { routingPlugin } from './routing'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

describe('routingPlugin', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server({ port: 0 })

    server.decorate('server', 'logger', {
      trace: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    })

    await server.register({
      plugin: routingPlugin,
      options: {
        routesDirectory: path.resolve(__dirname, '__fixtures__/routes')
      }
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /inlined-path/a (/a)', async () => {
    const res = await server.inject({ method: 'GET', url: '/inlined-path/a' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ a: true })
  })

  test('GET /b', async () => {
    const res = await server.inject({ method: 'GET', url: '/b' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ b: true })
  })

  test('POST /c', async () => {
    const res = await server.inject({ method: 'POST', url: '/c' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ c: true })
  })

  test('GET /d/nested/123', async () => {
    const res = await server.inject({ method: 'GET', url: '/d/nested/123' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ id: '123' })
  })

  test('Route not found', async () => {
    const res = await server.inject({ method: 'GET', url: '/non-existent' })

    expect(res.statusCode).toBe(404)
  })
})
