import {
  jest,
  describe,
  beforeAll,
  afterAll,
  test,
  expect
} from '@jest/globals'

import { Db, MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { createServer } from '../../server.js'

describe.skip('#mongoDb', () => {
  let server

  describe.skip('Set up', () => {
    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test.skip('Server should have expected MongoDb decorators', () => {
      expect(server.db).toBeInstanceOf(Db)
      expect(server.mongoClient).toBeInstanceOf(MongoClient)
      expect(server.locker).toBeInstanceOf(LockManager)
    })

    test.skip('MongoDb should have expected database name', () => {
      expect(server.db.databaseName).toBe('apha-integration-bridge')
    })

    test.skip('MongoDb should have expected namespace', () => {
      expect(server.db.namespace).toBe('apha-integration-bridge')
    })
  })

  describe.skip('Shut down', () => {
    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    test('Should close Mongo client on server stop', async () => {
      const closeSpy = jest.spyOn(server.mongoClient, 'close')
      await server.stop({ timeout: 0 })

      expect(closeSpy).toHaveBeenCalledWith(true)
    })
  })
})
