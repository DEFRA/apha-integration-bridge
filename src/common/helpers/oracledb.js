import oracledb from 'oracledb'
import retry from 'async-retry'
import { config } from '../../config.js'

const oracledbConfigurations = config.get('oracledb')

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
        server.logger.trace('Using proxy for OracleDB connections:', proxyUrl)

        const url = new URL(proxyUrl)

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
          poolAlias: key
        }

        if (httpsProxy && httpsProxyPort) {
          poolAttributes.httpsProxy = httpsProxy
          poolAttributes.httpsProxyPort = httpsProxyPort
        }

        server.logger.debug(
          `Creating OracleDB pool "${key}" with attributes`,
          poolAttributes
        )

        try {
          await retry(
            async () => {
              /**
               * create the pool for this oracledb connection
               */
              await oracledb.createPool(poolAttributes)

              server.logger.info(`OracleDB pool created for "${key}"`)
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
            `Failed to create OracleDB pool for "${key}":`,
            error
          )

          throw error
        }

        /**
         * decorate the server with a helper function, that will return
         * establish connection to this particular oracledb pool when called
         */
        server.decorate('server', `oracledb.${key}`, async () => {
          const connection = await oracledb.getConnection(key)

          server.logger.trace(`OracleDB connection established for "${key}"`)

          return {
            connection,
            [Symbol.asyncDispose]: async () => {
              await connection.close()

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
            server.logger.error(`Failed to close OracleDB pool ${key}:`, error)
          }
        })
      }
    }
  },
  options: {
    oracledbConfigurations
  }
}
