import Hapi from '@hapi/hapi'
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'

import { versionPlugin } from './versioning.js'

describe('Version Plugin', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server({ port: 3001 })

    await server.register({
      plugin: versionPlugin,
      options: { defaultVersion: 1.0 }
    })

    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        if (request.pre.apiVersion >= 2.0) {
          return {
            message: 'Version 2.0 or later',
            version: request.pre.apiVersion
          }
        }
        return { message: 'Version below 2.0', version: request.pre.apiVersion }
      }
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('responds with default version when no accept header', async () => {
    const res = await server.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({
      message: 'Version below 2.0',
      version: 1.0
    })
  })

  test('responds with version 1.1 content when accept header specifies 1.1', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test',
      headers: {
        accept: 'application/vnd.apha.1.1+json'
      }
    })
    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({
      message: 'Version below 2.0',
      version: 1.1
    })
  })

  test('responds with version 2.0 content when accept header specifies 2.0', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test',
      headers: {
        accept: 'application/vnd.apha.2.0+json'
      }
    })
    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({
      message: 'Version 2.0 or later',
      version: 2.0
    })
  })

  test('responds with version 3.5 content when accept header specifies 3.5', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test',
      headers: {
        accept: 'application/vnd.apha.3.5+json'
      }
    })
    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({
      message: 'Version 2.0 or later',
      version: 3.5
    })
  })
})
