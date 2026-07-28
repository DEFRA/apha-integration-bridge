import oracledb from 'oracledb'
import retry from 'async-retry'
import { config } from '../../config.js'
import { meter } from '../../lib/telemetry/index.js'

const oracledbConfigurations = config.get('oracledb')

const connectionTime = meter.createGauge('oracledb.connection.time', {
  description: 'Time taken to establish an OracleDB connection',
  unit: 'Milliseconds'
})

const connectionDuration = meter.createGauge('oracledb.connection.duration', {
  description: 'Duration of an OracleDB connection once established',
  unit: 'Milliseconds'
})

/** @type {string | undefined} */
const proxyUrl = config.get('httpProxy')

export const oracleDb = {
  plugin: {
    name: 'oracledb',
    version: '0.0.0',
    /**
     * @param {import('@hapi/hapi').Server} server
     * @param {{ oracledbConfigurations: typeof oracledbConfigurations }} options
     */
    register: async function (server, options) {
      server.logger.info('Setting up OracleDb')

      /**
       * @type {string | undefined}
       */
      let httpsProxy
      let httpsProxyPort

      /**
       * configure oracledb proxy information if we are using a proxy
       *
       * @note we should always be using a proxy in a deployed environment
       */
      if (proxyUrl) {
        const url = new URL(proxyUrl)

        // Log only host/port — a proxy URL can embed credentials.
        server.logger.trace(
          { proxyHost: url.hostname, proxyPort: url.port },
          'Using proxy for OracleDB connections'
        )

        httpsProxy = url.hostname

        httpsProxyPort = +url.port
      }

      for (const [key, config] of Object.entries(
        options.oracledbConfigurations
      )) {
        /**
         * build the pool attributes that we will use for this particular
         * oracledb connection pool
         *
         * @note we optionally add the proxy information if it is set
         *
         * @type {oracledb.PoolAttributes}
         */
        const poolAttributes = {
          user: config.username,
          password: config.password,
          connectString: `${config.host}/${config.dbname}`,
          poolMax: config.poolMax,
          poolMin: config.poolMin,
          poolTimeout: config.poolTimeout,
          poolPingInterval: config.poolPingInterval,
          expireTime: config.expireTime,
          poolAlias: key
        }

        if (httpsProxy && httpsProxyPort) {
          poolAttributes.httpsProxy = httpsProxy
          poolAttributes.httpsProxyPort = httpsProxyPort
        }

        // Never log `password` (or the full attributes object) — pino's
        // message-first form silently dropped this object before; the
        // object-first form actually emits it.
        const { password, ...redactedPoolAttributes } = poolAttributes

        server.logger.debug(
          { poolAttributes: redactedPoolAttributes },
          `Creating OracleDB pool "${key}" with attributes`
        )

        try {
          await retry(
            async () => {
              try {
                await oracledb.getPool(key)
              } catch (error) {
                if (!error.code || error.code !== 'NJS-047') {
                  throw error
                }

                /**
                 * create the pool for this oracledb connection
                 */
                await oracledb.createPool(poolAttributes)

                server.logger.info(`OracleDB pool created for "${key}"`)
              }
            },
            {
              retries: 3,
              minTimeout: 100,
              maxTimeout: 300,
              onRetry: () => {
                server.logger.warn(
                  `Retrying to create OracleDB pool "${key}"...`
                )
              }
            }
          )
        } catch (error) {
          server.logger.error(
            { err: error },
            `Failed to create OracleDB pool for "${key}"`
          )

          throw error
        }

        /**
         * decorate the server with a helper function, that will return
         * establish connection to this particular oracledb pool when called
         */
        server.decorate('server', `oracledb.${key}`, async () => {
          const startTime = Date.now()
          const connection = await oracledb.getConnection(key)

          server.logger.trace(`OracleDB connection established for "${key}"`)

          const elapsedTime = Date.now() - startTime

          /**
           * record how long it took to establish the connection
           */
          connectionTime.record(elapsedTime, {
            connectionPool: key
          })

          return {
            connection,
            [Symbol.asyncDispose]: async () => {
              const duration = Date.now() - startTime

              try {
                await connection.close()
              } catch (error) {
                server.logger.error(
                  { err: error },
                  `Failed to close OracleDB connection for "${key}"`
                )

                throw error
              } finally {
                /**
                 * record how long the connection was open for
                 */
                connectionDuration.record(duration, {
                  connectionPool: key
                })
              }

              server.logger.trace(`OracleDB connection closed for "${key}"`)
            }
          }
        })

        /**
         * ensure we safely close the pool when the server stops
         */
        server.events.on('stop', async () => {
          server.logger.info(`Closing OracleDB pool ${key}`)

          try {
            await oracledb.getPool(key).close(config.poolCloseWaitTime)
          } catch (error) {
            server.logger.error(
              { err: error },
              `Failed to close OracleDB pool ${key}`
            )
          }
        })
      }
    }
  },
  options: {
    oracledbConfigurations
  }
}
