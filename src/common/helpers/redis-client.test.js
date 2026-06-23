import { describe, beforeEach, afterEach, test, expect } from '@jest/globals'
import { buildRedisClient } from './redis-client.js'

describe('buildRedisClient', () => {
  let mockLogger
  const createdClients = []

  beforeEach(() => {
    mockLogger = {
      info: () => {},
      error: () => {}
    }
  })

  afterEach(async () => {
    // Disconnect all created Redis clients to prevent hanging
    await Promise.all(
      createdClients.map(async (client) => {
        try {
          await client.disconnect()
        } catch (error) {
          // Ignore errors during cleanup
        }
      })
    )
    createdClients.length = 0
  })

  test('creates single instance Redis client with minimal config', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.port).toBe(6379)
    expect(client.options.host).toBe('127.0.0.1')
  })

  test('creates single instance Redis client with full config', () => {
    const config = {
      host: 'redis.example.com',
      port: 6380,
      db: 2,
      keyPrefix: 'test-prefix:',
      username: 'testuser',
      password: 'testpass',
      useTLS: false,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.port).toBe(6380)
    expect(client.options.host).toBe('redis.example.com')
    expect(client.options.db).toBe(2)
    expect(client.options.keyPrefix).toBe('test-prefix:')
    expect(client.options.username).toBe('testuser')
    expect(client.options.password).toBe('testpass')
  })

  test('creates single instance Redis client with TLS enabled', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useTLS: true,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.tls).toBeDefined()
  })

  test('creates single instance Redis client without TLS when disabled', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useTLS: false,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.tls).toBeUndefined()
  })

  test('creates cluster Redis client when useSingleInstanceCache is false', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      keyPrefix: 'cluster-prefix:',
      useSingleInstanceCache: false
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    // Cluster client has different structure
    expect(client.options).toBeDefined()
    expect(client.options.keyPrefix).toBe('cluster-prefix:')
  })

  test('creates cluster Redis client with credentials', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      username: 'clusteruser',
      password: 'clusterpass',
      db: 1,
      useSingleInstanceCache: false
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.redisOptions.username).toBe('clusteruser')
    expect(client.options.redisOptions.password).toBe('clusterpass')
    expect(client.options.redisOptions.db).toBe(1)
  })

  test('creates cluster Redis client with TLS', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useTLS: true,
      useSingleInstanceCache: false
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.redisOptions.tls).toBeDefined()
  })

  test('handles empty username by omitting credentials', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      username: '',
      password: 'somepass',
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    // ioredis sets undefined values to null
    expect(client.options.username).toBeFalsy()
    expect(client.options.password).toBeFalsy()
  })

  test('handles undefined username by omitting credentials', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      password: 'somepass',
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    // ioredis sets undefined values to null
    expect(client.options.username).toBeFalsy()
    expect(client.options.password).toBeFalsy()
  })

  test('uses default port 6379 when port is not specified', () => {
    const config = {
      host: '127.0.0.1',
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.port).toBe(6379)
  })

  test('uses default db 0 when db is not specified', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.options.db).toBe(0)
  })

  test('works without logger', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config)
    createdClients.push(client)

    expect(client).toBeDefined()
  })

  test('sets up event handlers for connect and error', () => {
    const config = {
      host: '127.0.0.1',
      port: 6379,
      useSingleInstanceCache: true
    }

    const client = buildRedisClient(config, mockLogger)
    createdClients.push(client)

    expect(client).toBeDefined()
    expect(client.listenerCount('connect')).toBeGreaterThan(0)
    expect(client.listenerCount('error')).toBeGreaterThan(0)
  })
})
