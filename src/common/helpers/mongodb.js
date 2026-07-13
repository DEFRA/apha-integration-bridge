import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { config } from '../../config.js'

/**
 * @typedef {{
 *   mongoUri: string,
 *   databaseName: string,
 *   retryWrites: boolean,
 *   readPreference: import('mongodb').ReadPreferenceMode
 * }} MongoDbPluginOptions
 */

const mongoConfig = config.get('mongo')

/**
 * @type {import('@hapi/hapi').ServerRegisterPluginObject<MongoDbPluginOptions>}
 */
export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    /**
     * @param {import('../../types/api.js').ServerWithSecureContext} server
     * @param {MongoDbPluginOptions} options
     */
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      /**
       * The decorated values are annotated with the consumer-facing
       * `ServerWithMongo` members so drift between that typedef and what
       * this plugin actually produces becomes a compile error —
       * `server.decorate()` itself is not checked against it.
       *
       * @type {import('../../types/api.js').ServerWithMongo['mongoClient']}
       */
      const client = await MongoClient.connect(options.mongoUri, {
        retryWrites: options.retryWrites,
        readPreference: options.readPreference,
        ...(server.secureContext && { secureContext: server.secureContext })
      })

      const databaseName = options.databaseName

      /**
       * @type {import('../../types/api.js').ServerWithMongo['db']}
       */
      const db = client.db(databaseName)

      /**
       * @type {import('../../types/api.js').ServerWithMongo['locker']}
       */
      const locker = new LockManager(db.collection('mongo-locks'))

      await createIndexes(db)

      server.logger.info(`MongoDb connected to ${databaseName}`)

      server.decorate('server', 'mongoClient', client)
      server.decorate('server', 'db', db)
      server.decorate('server', 'locker', locker)
      server.decorate('request', 'db', () => db, { apply: true })
      server.decorate('request', 'locker', () => locker, { apply: true })

      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        await client.close(true)
      })
    }
  },
  options: {
    mongoUri: mongoConfig.uri,
    databaseName: mongoConfig.databaseName,
    retryWrites: false,
    readPreference: 'secondary'
  }
}

/**
 * @param {import('mongodb').Db} db
 */
async function createIndexes(db) {
  await db.collection('mongo-locks').createIndex({ id: 1 })

  // Example of how to create a mongodb index. Remove as required
  await db.collection('example-data').createIndex({ id: 1 })
}
