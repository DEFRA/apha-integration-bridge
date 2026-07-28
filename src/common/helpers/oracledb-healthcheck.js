/** @import { Server } from '@hapi/hapi' */
/** @import { Connection } from 'oracledb' */

import { config } from '../../config.js'
import { meter } from '../../lib/telemetry/index.js'

/**
 * @typedef {{
 *   connection: Connection,
 *   [Symbol.asyncDispose]: () => Promise<void>
 * }} OracleDbHandle
 */

const status = meter.createGauge('oracledb.healthcheck.status', {
  description: 'OracleDB pool healthcheck status (1 success, 0 failure)',
  unit: 'None'
})

const duration = meter.createGauge('oracledb.healthcheck.duration', {
  description: 'Duration of the OracleDB healthcheck probe',
  unit: 'Milliseconds'
})

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
const withTimeout = (promise, ms) => {
  /** @type {NodeJS.Timeout} */
  let timer

  /** @type {Promise<never>} */
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Healthcheck timed out after ${ms}ms`)),
      ms
    )
    timer.unref()
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export const oracleDbHealthcheck = {
  plugin: {
    name: 'oracledb-healthcheck',
    version: '0.0.0',
    /**
     * @param {Server} server
     */
    register(server) {
      if (!config.get('oracledbHealthcheck.enabled')) {
        server.logger.info('OracleDB healthcheck is disabled')
        return
      }

      const intervalMs = config.get('oracledbHealthcheck.intervalMs')

      const timeoutMs = config.get('oracledbHealthcheck.timeoutMs')

      const pools = Object.keys(config.get('oracledb'))

      /** @type {Map<string, NodeJS.Timeout>} */
      const timers = new Map()

      /** @type {Set<Promise<void>>} */
      const inflight = new Set()

      let stopped = false

      /**
       * @param {string} pool
       * @returns {Promise<void>}
       */
      const probe = async (pool) => {
        const started = Date.now()
        try {
          await withTimeout(
            (async () => {
              const acquire = /** @type {() => Promise<OracleDbHandle>} */ (
                /** @type {any} */ (server)[`oracledb.${pool}`]
              )

              await using db = await acquire()

              db.connection.callTimeout = timeoutMs

              await db.connection.execute('SELECT 1 FROM DUAL')
            })(),
            timeoutMs
          )
          status.record(1, { connectionPool: pool })
        } catch (err) {
          status.record(0, { connectionPool: pool })

          server.logger.warn({ err, pool }, 'OracleDB healthcheck failed')
        } finally {
          duration.record(Date.now() - started, { connectionPool: pool })
        }
      }

      /**
       * @param {string} pool
       */
      const schedule = (pool) => {
        const p = probe(pool)

        inflight.add(p)

        p.finally(() => {
          inflight.delete(p)

          if (stopped) {
            return
          }

          const timer = setTimeout(() => {
            schedule(pool)
          }, intervalMs)

          timer.unref()

          timers.set(pool, timer)
        })
      }

      server.ext('onPostStart', () => {
        for (const pool of pools) {
          schedule(pool)
        }
      })

      server.ext('onPreStop', async () => {
        stopped = true

        for (const timer of timers.values()) {
          clearTimeout(timer)
        }

        timers.clear()

        await Promise.all(inflight)
      })
    }
  }
}
