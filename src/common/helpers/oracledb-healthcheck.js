/** @import { Server } from '@hapi/hapi' */
/** @import { Connection } from 'oracledb' */

import { config } from '../../config.js'
import { meter } from '../../lib/telemetry/index.js'
import {
  parseHost,
  POOL_CLOSE_MARGIN_MS,
  SHUTDOWN_MARGIN_MS
} from './oracledb.js'

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
 * Stable application code for the healthcheck's own race timeout, so a
 * synthetic timeout is never confused with a driver classification in logs
 * or the runbook.
 */
const APP_HEALTHCHECK_TIMEOUT = 'APP_HEALTHCHECK_TIMEOUT'

/** Emit a skip warning on the first skip and then every Nth, not every tick. */
const SKIP_WARN_EVERY = 4

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {() => void} [onTimeout] runs INSIDE the timeout callback, before
 *   the race rejects — so callers observing the flag it sets can never race
 *   the rejection across a microtask gap.
 * @returns {Promise<T>}
 */
const withTimeout = (promise, ms, onTimeout) => {
  /** @type {NodeJS.Timeout} */
  let timer

  /** @type {Promise<never>} */
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(
        Object.assign(new Error(`Healthcheck timed out after ${ms}ms`), {
          code: APP_HEALTHCHECK_TIMEOUT
        })
      )
    }, ms)
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

      const oracledbConfigurations = /** @type {Record<string, any>} */ (
        config.get('oracledb')
      )

      const ecsStopTimeoutMs = config.get('ecsStopTimeoutMs')

      const pools = Object.keys(oracledbConfigurations)

      /**
       * Shutdown drain deadline, derived from every configured acquisition
       * bound (incl. retry × address-count amplification), clamped so the
       * subsequent pool-close phase keeps its reserved window inside the ECS
       * stop budget. The un-wedge TTL is a multiple of the same figure.
       */
      const graceMs =
        Math.max(
          2 * timeoutMs,
          ...Object.values(oracledbConfigurations).map((poolConfig) => {
            const { addressCount } = parseHost(String(poolConfig.host))
            return Math.max(
              (1 + poolConfig.retryCount) *
                addressCount *
                poolConfig.connectTimeout *
                1_000,
              poolConfig.transportConnectTimeout * 1_000,
              poolConfig.queueTimeoutMs
            )
          })
        ) + 1_000

      const maxPoolCloseWaitMs =
        Math.max(
          ...Object.values(oracledbConfigurations).map(
            (poolConfig) => poolConfig.poolCloseWaitTime
          )
        ) * 1_000

      const drainDeadlineMs = Math.max(
        1_000,
        Math.min(
          graceMs,
          ecsStopTimeoutMs -
            maxPoolCloseWaitMs -
            POOL_CLOSE_MARGIN_MS -
            SHUTDOWN_MARGIN_MS
        )
      )

      /**
       * Un-wedge TTL: how long unsettled work may gate probing before a
       * rate-limited bypass probe is allowed. Derived from the drain
       * deadline but CAPPED at 60s — recovery detection in the wedged case
       * must stay well inside orchestrator healthcheck timescales even when
       * ops raise the stop budget (a bypass per <=60s adds at most one
       * orphaned acquisition per window; the driver's poolMax + queueMax is
       * the hard ceiling, shared with API traffic by design and documented
       * as an accepted bounded cost).
       */
      const unwedgeTtlMs = Math.min(5 * drainDeadlineMs, 60_000)

      /** @type {Map<string, NodeJS.Timeout>} */
      const timers = new Map()

      /**
       * Raced probe promises — settle within timeoutMs by construction, so
       * awaiting them at stop is bounded.
       *
       * @type {Set<Promise<void>>}
       */
      const inflight = new Set()

      /**
       * The UNSETTLED underlying probe work per pool. This map (not
       * `inflight`) gates whether a new probe may start: strictly one
       * underlying acquisition in flight per pool. Entries carry their start
       * time so the un-wedge TTL can allow a rate-limited bypass probe when
       * driver bounds have failed and the work never settles.
       *
       * @type {Map<string, { promise: Promise<void>, startedAt: number }>}
       */
      const underlying = new Map()

      /** @type {Map<string, { skips: number, lastBypassAt: number }>} */
      const poolState = new Map()

      /**
       * Abandoned-but-unsettled probe work (replaced by a bypass probe).
       * Tracked so shutdown drains it and the bypass log can report the
       * count. Growth self-limits: each orphan occupies a driver queue slot,
       * so at queueMax further acquires reject instantly with NJS-076 —
       * settling (and removing) themselves.
       *
       * @type {Set<Promise<void>>}
       */
      const orphans = new Set()

      let stopped = false

      /**
       * The underlying (unraced) probe work. The `await using` disposal here
       * is the SINGLE owner of the connection — settle handlers elsewhere do
       * bookkeeping only and never close.
       *
       * @param {string} pool
       * @returns {Promise<void>}
       */
      const underlyingProbe = async (pool) => {
        const acquire = /** @type {() => Promise<OracleDbHandle>} */ (
          /** @type {any} */ (server)[`oracledb.${pool}`]
        )

        await using db = await acquire()

        /**
         * Bound the probe query, then restore the EXACT prior value before
         * the connection returns to the shared pool — a leaked callTimeout
         * would silently apply to later API queries on this connection.
         * (`undefined` and `0` are preserved as-is.)
         */
        const savedCallTimeout = db.connection.callTimeout

        try {
          db.connection.callTimeout = timeoutMs

          await db.connection.execute('SELECT 1 FROM DUAL')
        } finally {
          try {
            db.connection.callTimeout = savedCallTimeout
          } catch {
            // a dead socket may reject property access — never mask the
            // original probe error
          }
        }
      }

      /**
       * @param {string} pool
       * @returns {Promise<void>}
       */
      const probe = async (pool) => {
        const started = Date.now()

        let raceTimedOut = false

        const work = underlyingProbe(pool)

        underlying.set(pool, { promise: work, startedAt: started })

        /**
         * Bookkeeping ONLY (single disposal owner is the `await using` in
         * underlyingProbe). Runs on both settle paths; reopens the gate and
         * surfaces the ACTUAL driver code when the raced probe had already
         * timed out — the only place a real code appears in that case.
         */
        /**
         * Note: after the driver's own queueTimeout has expired the acquire,
         * the application-observable settlement is NJS-040 — the eventual
         * underlying ORA error is discarded inside the driver (see the
         * NJS-040 runbook note in .design/STAGE1-FINDINGS). This handler
         * logs whatever the driver let through.
         *
         * Deliberately NOT guarded by `stopped`: this is the only place the
         * driver code for a probe abandoned during shutdown surfaces, it
         * never reschedules or records metrics, and its map cleanup is
         * identity-checked — a recorded deviation from the plan's literal
         * "stopped guard on the settle path" wording.
         */
        work
          .catch((error) => {
            if (raceTimedOut) {
              server.logger.warn(
                { err: error, code: /** @type {any} */ (error)?.code, pool },
                'OracleDB healthcheck: abandoned probe settled with an error'
              )
            }
          })
          .finally(() => {
            const entry = underlying.get(pool)

            if (entry?.promise === work) {
              underlying.delete(pool)
            }

            orphans.delete(work)
          })

        try {
          await withTimeout(work, timeoutMs, () => {
            raceTimedOut = true
          })

          status.record(1, { connectionPool: pool })
        } catch (err) {
          status.record(0, { connectionPool: pool })

          server.logger.warn(
            {
              err,
              code: /** @type {any} */ (err)?.code,
              pool,
              elapsedMs: Date.now() - started
            },
            'OracleDB healthcheck failed'
          )
        } finally {
          duration.record(Date.now() - started, { connectionPool: pool })
        }
      }

      /**
       * @param {string} pool
       */
      const tick = (pool) => {
        const state = poolState.get(pool) ?? { skips: 0, lastBypassAt: 0 }
        poolState.set(pool, state)

        const pending = underlying.get(pool)

        if (pending) {
          const ageMs = Date.now() - pending.startedAt

          const bypassDue =
            ageMs >= unwedgeTtlMs &&
            Date.now() - state.lastBypassAt >= unwedgeTtlMs

          if (!bypassDue) {
            /**
             * Skip: the previous underlying acquisition has not settled —
             * strictly one in flight per pool. A wedged acquire means the
             * pool cannot be shown healthy, so status records 0; no duration
             * point is recorded (dashboards key off status; a zero sentinel
             * would skew duration averages).
             */
            status.record(0, { connectionPool: pool })

            state.skips += 1

            if (state.skips === 1 || state.skips % SKIP_WARN_EVERY === 0) {
              server.logger.warn(
                { pool, ageMs, skips: state.skips },
                'OracleDB healthcheck skipped — previous probe has not settled (driver bounds may have failed)'
              )
            }

            return false
          }

          /**
           * Un-wedge bypass: the unsettled work is older than the TTL, so
           * driver bounds have failed. Allow ONE bypass probe per TTL window
           * (bounded growth ≤ 1 per TTL; the driver's own poolMax + queueMax
           * is the hard ceiling on outstanding acquisitions) so recovery
           * detection can never be permanently wedged.
           */
          state.lastBypassAt = Date.now()

          /**
           * The wedged work is moved to the orphan set: still drained at
           * stop, still bookkept on settle — but no longer the gate entry
           * (the bypass probe replaces it).
           */
          orphans.add(pending.promise)

          server.logger.error(
            { pool, ageMs, orphanCount: orphans.size },
            'OracleDB healthcheck: unsettled probe exceeded the un-wedge TTL — issuing a rate-limited bypass probe'
          )
        }

        state.skips = 0

        return true
      }

      /**
       * @param {string} pool
       */
      const schedule = (pool) => {
        if (stopped) {
          return
        }

        /** @type {Promise<void>} */
        const p = tick(pool) ? probe(pool) : Promise.resolve()

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

        /**
         * Drain the bounded raced probes AND the underlying work in
         * parallel, capped by the derived deadline — shutdown must never
         * hang on a wedged acquisition (the exact case the backstop exists
         * for). On expiry: warn and proceed; a late settle only performs its
         * bookkeeping. The ECS SIGKILL after stopTimeout reaps anything left.
         */
        const drain = Promise.all([
          ...inflight,
          ...[...underlying.values()].map((entry) =>
            entry.promise.catch(() => {})
          ),
          ...[...orphans].map((orphan) => orphan.catch(() => {}))
        ])

        /** @type {NodeJS.Timeout} */
        let timer

        const drained = await Promise.race([
          drain.then(() => true),
          new Promise((resolve) => {
            timer = setTimeout(() => resolve(false), drainDeadlineMs)
            timer.unref()
          })
        ]).finally(() => clearTimeout(timer))

        if (!drained) {
          server.logger.warn(
            { drainDeadlineMs },
            'OracleDB healthcheck: shutdown drain deadline expired — proceeding (in-flight driver work abandoned)'
          )
        }
      })
    }
  }
}
