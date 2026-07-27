import oracledb from 'oracledb'
import { config } from '../../config.js'
import { meter } from '../../lib/telemetry/index.js'

const connectionTime = meter.createGauge('oracledb.connection.time', {
  description: 'Time taken to establish an OracleDB connection',
  unit: 'Milliseconds'
})

const connectionDuration = meter.createGauge('oracledb.connection.duration', {
  description: 'Duration of an OracleDB connection once established',
  unit: 'Milliseconds'
})

/**
 * Driver error codes observed at getConnection time (verified empirically in
 * .design/STAGE1-FINDINGS-oracledb-healthcheck-crashloop.md):
 *  - config-class (fatal at preflight): bad credentials / privilege problems
 *  - unknown-service (NJS-518): the listener answered but does not know the
 *    service — retried briefly (a restarting database registers its service
 *    within seconds), then fatal (service-name typo / prolonged service-down)
 *  - everything else: outage-class — boot continues with a red healthcheck
 */
const PREFLIGHT_FATAL_CODES = new Set([
  'ORA-01017', // invalid credentials
  'ORA-01045', // account lacks CREATE SESSION privilege
  'ORA-28000' // account locked
])

const PREFLIGHT_UNKNOWN_SERVICE_CODE = 'NJS-518'

/**
 * Numeric ranges for the pool settings forwarded to the driver. The driver
 * itself imposes no upper bounds; the pool-shape ceilings here are deliberate
 * wide sanity checks, and only the safety-critical settings carry tight
 * ranges.
 */
const RANGES = {
  poolMin: [0, 1_000],
  poolMax: [1, 1_000],
  poolTimeout: [0, 86_400],
  poolCloseWaitTime: [0, 10],
  expireTime: [0, 1_440],
  connectTimeout: [1, 300],
  transportConnectTimeout: [1, 300],
  retryCount: [0, 2],
  queueTimeoutMs: [1_000, 60_000],
  queueMax: [0, 500]
}

/** Margin reserved out of the ECS stop window for non-Oracle stop handlers. */
export const SHUTDOWN_MARGIN_MS = 5_000

/**
 * The preflight race timer sits ABOVE the driver's own queueTimeout so the
 * driver's verdict (a real error code, or NJS-040 queue timeout) always
 * arrives first: once the driver's queueTimeout has expired a request, the
 * underlying creation's eventual failure is discarded inside the driver
 * (lib/pool.js request.isWaiting suppression) and can never be observed at
 * the application layer. A creation whose auth phase outlives queueTimeout is
 * therefore indistinguishable from an outage at EVERY layer — a driver
 * limitation, covered in the runbook (persistent NJS-040 while the listener
 * is reachable ⇒ investigate credentials/auth latency).
 */
const PREFLIGHT_TIMEOUT_MARGIN_MS = 2_000

/** Bound on each pool close beyond its configured drain, so a stuck
 * in-flight acquisition can never hang rollback or shutdown (pool.close
 * waits unboundedly for in-flight work in the driver). */
export const POOL_CLOSE_MARGIN_MS = 5_000

/**
 * @param {string} host
 * @returns {{ tcps: boolean, addressCount: number }}
 */
export const parseHost = (host) => {
  const tcps = /^tcps:\/\//i.test(host)
  const withoutScheme = host.replace(/^tcps?:\/\//i, '')
  // Easy Connect accepts both comma (address list) and semicolon (address
  // group) separators; IPv6 literals are bracketed so their internal colons
  // never look like list separators.
  const addressCount = withoutScheme.split(/[,;]/).length
  return { tcps, addressCount }
}

/**
 * @param {string} name
 * @param {any} value
 * @param {[number, number]} range
 * @param {string[]} problems
 */
const checkRange = (name, value, range, problems) => {
  if (!Number.isInteger(value) || value < range[0] || value > range[1]) {
    problems.push(
      `${name} must be an integer between ${range[0]} and ${range[1]} (got ${value})`
    )
  }
}

/**
 * Validates every pool configuration BEFORE any pool is created, so an
 * invalid configuration can never leave a partially-created pool set behind.
 *
 * Returns the normalized per-pool settings (derived queueMax, forced poolMin)
 * plus startup warnings to emit once a logger is available.
 *
 * @param {Record<string, any>} configurations
 * @param {{ healthcheckTimeoutMs: number, ecsStopTimeoutMs: number, proxyUrl?: string | null }} context
 */
export const validateOracleDbConfigurations = (
  configurations,
  { healthcheckTimeoutMs, ecsStopTimeoutMs, proxyUrl = null }
) => {
  /** @type {string[]} */
  const problems = []

  /** @type {string[]} */
  const warnings = []

  checkRange('ecsStopTimeoutMs', ecsStopTimeoutMs, [10_000, 120_000], problems)

  const pools = Object.entries(configurations).map(([key, poolConfig]) => {
    const label = `oracledb.${key}`

    for (const field of ['host', 'dbname']) {
      const value = /** @type {any} */ (poolConfig)[field]

      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`${label}.${field} must be a non-empty string`)
        continue
      }

      /**
       * The connect string is always built as `${host}/${dbname}?...` — a
       * full descriptor, TNS alias with parentheses, embedded query string or
       * whitespace cannot survive that construction, so reject them loudly
       * instead of producing a silently-broken connect string.
       */
      if (/[()?\s]/.test(value)) {
        problems.push(
          `${label}.${field} must be plain Easy Connect form (host:port / service name) — descriptors, TNS aliases, embedded "?" or whitespace are not supported (got "${value}")`
        )
      }
    }

    for (const [field, range] of Object.entries(RANGES)) {
      // queueMax is nullable — null means "derive", which is in range by
      // construction; only an explicit value needs checking.
      if (field === 'queueMax' && poolConfig.queueMax === null) {
        continue
      }

      checkRange(
        `${label}.${field}`,
        /** @type {any} */ (poolConfig)[field],
        /** @type {[number, number]} */ (range),
        problems
      )
    }

    // poolPingInterval is an integer but negatives are a valid driver
    // sentinel (disable pinging) — no range beyond integer-ness.
    if (!Number.isInteger(poolConfig.poolPingInterval)) {
      problems.push(`${label}.poolPingInterval must be an integer`)
    }

    if (poolConfig.poolMin > poolConfig.poolMax) {
      problems.push(`${label}.poolMin must be <= poolMax`)
    }

    if (poolConfig.connectTimeout < poolConfig.transportConnectTimeout) {
      problems.push(
        `${label}.connectTimeout must be >= transportConnectTimeout`
      )
    }

    const { tcps, addressCount } = parseHost(String(poolConfig.host))

    if (addressCount > 1 && poolConfig.retryCount !== 0) {
      problems.push(
        `${label}.retryCount must be 0 for multi-host connect strings (retries multiply across every address)`
      )
    }

    /**
     * poolMin is forced to 0 unconditionally: node-oracledb thin mode's pool
     * background thread hot-spins (~100% CPU + rapid memory growth) when
     * poolMin > 0 and the database fails connection attempts quickly —
     * unfixed upstream as of 6.10.0/7.0.1. See
     * .design/UPSTREAM-ISSUE-DRAFT-node-oracledb-poolmin-spin.md
     * (replace with the upstream issue URL once filed).
     */
    const poolMin = 0

    if (poolConfig.poolMin > 0) {
      warnings.push(
        `${label}: configured poolMin=${poolConfig.poolMin} was overridden to 0 — thin-mode pools with poolMin > 0 hot-spin the CPU when the database is unreachable (known node-oracledb defect)`
      )
    }

    const queueMax =
      poolConfig.queueMax ?? Math.min(500, Math.max(25, 2 * poolConfig.poolMax))

    /**
     * Shutdown-budget feasibility on the HEALTHY path: the drain window plus
     * the pool-close window must fit inside the ECS stop window. The
     * outage-amplified worst case only warns — a SIGKILL during a total
     * outage shutdown is acceptable (there is nothing to drain).
     */
    const healthyBoundMs =
      Math.max(
        2 * healthcheckTimeoutMs,
        poolConfig.connectTimeout * 1_000,
        poolConfig.queueTimeoutMs
      ) +
      poolConfig.poolCloseWaitTime * 1_000 +
      POOL_CLOSE_MARGIN_MS +
      SHUTDOWN_MARGIN_MS

    if (healthyBoundMs > ecsStopTimeoutMs) {
      problems.push(
        `${label}: shutdown budget infeasible — healthy-path drain+close bound ${healthyBoundMs}ms exceeds ECS_STOP_TIMEOUT_MS ${ecsStopTimeoutMs}ms; lower connectTimeout/queueTimeoutMs/poolCloseWaitTime or raise the task stopTimeout`
      )
    }

    /**
     * Mirrors the healthcheck's runtime drain-deadline derivation so the
     * advisory warns about exactly what Stage 3 will actually attempt to
     * drain (before its clamp), plus the close windows and margins.
     */
    const outageBoundMs =
      Math.max(
        2 * healthcheckTimeoutMs,
        (1 + poolConfig.retryCount) *
          addressCount *
          poolConfig.connectTimeout *
          1_000,
        poolConfig.transportConnectTimeout * 1_000,
        poolConfig.queueTimeoutMs
      ) +
      1_000 +
      poolConfig.poolCloseWaitTime * 1_000 +
      POOL_CLOSE_MARGIN_MS +
      SHUTDOWN_MARGIN_MS

    if (outageBoundMs > ecsStopTimeoutMs) {
      warnings.push(
        `${label}: outage-amplified shutdown bound ${outageBoundMs}ms exceeds ECS_STOP_TIMEOUT_MS ${ecsStopTimeoutMs}ms — during a total outage shutdown the task may be SIGKILLed before driver work settles (accepted tradeoff)`
      )
    }

    return {
      key,
      config: poolConfig,
      poolMin,
      queueMax,
      tcps,
      addressCount,
      connectString: `${poolConfig.host}/${poolConfig.dbname}?connect_timeout=${poolConfig.connectTimeout}&transport_connect_timeout=${poolConfig.transportConnectTimeout}&retry_count=${poolConfig.retryCount}`
    }
  })

  /**
   * A malformed proxy URL is FATAL when any pool is TCPS (the proxy would
   * apply there — silently omitting it changes the network path). With only
   * plain-TCP pools the proxy is inapplicable anyway, so it merely warns.
   */
  if (proxyUrl) {
    const { invalid } = resolveProxy(proxyUrl, true)

    if (invalid) {
      if (pools.some((pool) => pool.tcps)) {
        problems.push(
          `${invalid} — required for TCPS connect strings; fix or unset HTTP_PROXY`
        )
      } else {
        warnings.push(`${invalid} — ignored (no TCPS connect strings)`)
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid OracleDB configuration:\n - ${problems.join('\n - ')}`
    )
  }

  return { pools, warnings }
}

/**
 * Resolves the HTTP CONNECT proxy attributes for a pool. Thin mode only uses
 * httpsProxy for TCPS connections, and activating a proxy on a plain-TCP
 * connect string would break it — so attrs are returned ONLY when the
 * connection is TCPS.
 *
 * `invalid` is non-null when the proxy URL itself is malformed (bad URL,
 * unsupported scheme, out-of-range port). For a TCPS pool that is a FATAL
 * configuration error (validated before any pool is created) — silently
 * omitting a required proxy would change the network path. For plain-TCP
 * pools the proxy is inapplicable anyway, so invalidity only warns.
 *
 * @param {string | null} proxyUrl
 * @param {boolean} tcps
 * @returns {{ attrs: { httpsProxy: string, httpsProxyPort: number } | null, warning: string | null, invalid: string | null }}
 */
export const resolveProxy = (proxyUrl, tcps) => {
  if (!proxyUrl) {
    return { attrs: null, warning: null, invalid: null }
  }

  /** @type {URL} */
  let url

  try {
    url = new URL(proxyUrl)
  } catch {
    return {
      attrs: null,
      warning: null,
      invalid: `HTTP_PROXY is not a valid URL ("${proxyUrl}")`
    }
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return {
      attrs: null,
      warning: null,
      invalid: `HTTP_PROXY has unsupported scheme "${url.protocol}"`
    }
  }

  // An empty url.port means the scheme default; an explicit :0 is invalid.
  const port =
    url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : +url.port

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return {
      attrs: null,
      warning: null,
      invalid: `HTTP_PROXY port "${url.port}" is out of range`
    }
  }

  if (!tcps) {
    return {
      attrs: null,
      warning:
        'HTTP_PROXY is set but the Oracle connect string is plain TCP — thin mode only proxies TCPS connections, so proxy attributes are omitted',
      invalid: null
    }
  }

  return {
    attrs: { httpsProxy: url.hostname, httpsProxyPort: port },
    warning: null,
    invalid: null
  }
}

/**
 * Classifies a preflight failure.
 *
 * @param {any} error
 * @returns {'fatal' | 'unknown-service' | 'outage'}
 */
export const classifyPreflightError = (error) => {
  const code = String(error?.code ?? '')

  if (PREFLIGHT_FATAL_CODES.has(code)) {
    return 'fatal'
  }

  if (code === PREFLIGHT_UNKNOWN_SERVICE_CODE) {
    return 'unknown-service'
  }

  return 'outage'
}

/**
 * Closes every pool in `keys`, tolerating pools that were never created —
 * used both for startup rollback and the (single) stop handler.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {Array<{ key: string, config: { poolCloseWaitTime: number } }>} pools
 */
const closePools = async (
  server,
  pools,
  closeMarginMs = POOL_CLOSE_MARGIN_MS
) => {
  // Pools close CONCURRENTLY so the total shutdown cost is the largest
  // single poolCloseWaitTime, not the sum across pools — the shutdown-budget
  // feasibility validation is per pool and relies on this. Each close is
  // additionally BOUNDED: the driver's pool.close waits without limit for
  // in-flight acquisitions, so a stuck creation on one pool must not hang
  // rollback/shutdown — on expiry we warn and abandon (the process is
  // exiting; the ECS SIGKILL backstop reaps anything left).
  await Promise.all(
    pools.map(async (pool) => {
      /** @type {oracledb.Pool} */
      let handle

      try {
        handle = oracledb.getPool(pool.key)
      } catch {
        // NJS-047: pool was never created (or already closed) — nothing to do.
        return
      }

      const boundMs = pool.config.poolCloseWaitTime * 1_000 + closeMarginMs

      /** @type {NodeJS.Timeout} */
      let timer

      try {
        const closing = handle.close(pool.config.poolCloseWaitTime)

        // Promise.race already subscribes to the close promise, but an
        // explicit sink both documents the abandon path and surfaces late
        // close failures that would otherwise be invisible.
        closing.catch((error) => {
          server.logger.warn(
            { err: error },
            `OracleDB pool "${pool.key}" close failed after being abandoned`
          )
        })

        const closed = await Promise.race([
          closing.then(() => true),
          new Promise((resolve) => {
            timer = setTimeout(() => resolve(false), boundMs)
            timer.unref()
          })
        ])

        if (closed) {
          server.logger.info(`Closed OracleDB pool "${pool.key}"`)
        } else {
          server.logger.warn(
            `OracleDB pool "${pool.key}" close exceeded ${boundMs}ms — abandoning (driver work may still be in flight)`
          )
        }
      } catch (error) {
        server.logger.error(
          { err: error },
          `Failed to close OracleDB pool "${pool.key}"`
        )
      } finally {
        clearTimeout(timer)
      }
    })
  )
}

/**
 * One preflight acquisition attempt with exactly-once disposal: the inner
 * task owns the connection and always closes it — including when it resolves
 * AFTER the surrounding race has already timed out and moved on.
 *
 * @param {string} key
 * @param {number} timeoutMs
 * @param {(error: any | null) => void} [onLateSettle] invoked if the
 *   underlying attempt settles AFTER the race already timed out — a late
 *   configuration-class error here means a bad rollout slipped past the
 *   preflight window and must at least be loudly visible.
 * @returns {Promise<{ ok: boolean, error?: any }>}
 */
const preflightAttempt = async (key, timeoutMs, onLateSettle) => {
  let raceTimedOut = false

  const task = (async () => {
    const connection = await oracledb.getConnection(key)

    // Bound the probe query, then restore the exact prior value BEFORE the
    // connection returns to the shared pool — a leaked callTimeout would
    // silently apply to later API queries on the same pooled connection.
    const savedCallTimeout = connection.callTimeout

    try {
      connection.callTimeout = timeoutMs
      await connection.execute('SELECT 1 FROM DUAL')
    } finally {
      try {
        connection.callTimeout = savedCallTimeout
      } catch {
        // a dead socket may reject property access — never mask the original error
      }
      await connection.close()
    }
  })()

  // The task owns disposal; these handlers stop a late rejection from
  // becoming an unhandledRejection and surface late settlements to the
  // caller once the race below has already moved on.
  task.then(
    () => {
      if (raceTimedOut) onLateSettle?.(null)
    },
    (error) => {
      if (raceTimedOut) onLateSettle?.(error)
    }
  )

  /** @type {NodeJS.Timeout} */
  let timer

  try {
    await Promise.race([
      task,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
          raceTimedOut = true
          reject(
            Object.assign(
              new Error(
                `Preflight timed out after ${timeoutMs}ms (treated as outage-class)`
              ),
              { code: 'APP_PREFLIGHT_TIMEOUT' }
            )
          )
        }, timeoutMs)
        timer.unref()
      })
    ])
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  } finally {
    clearTimeout(timer)
  }
}

/** @param {number} ms */
const sleep = (ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    timer.unref()
  })

export const oracleDb = {
  plugin: {
    name: 'oracledb',
    version: '0.0.0',
    /**
     * @param {import('@hapi/hapi').Server} server
     * @param {{
     *   oracledbConfigurations?: Record<string, any>,
     *   preflight?: { retryWindowMs?: number, retryDelayMs?: number, timeoutMs?: number, budgetMs?: number },
     *   shutdown?: { closeMarginMs?: number }
     * }} options
     */
    register: async function (server, options) {
      server.logger.info('Setting up OracleDb')

      // Every config read happens inside register (never at module import),
      // so tests and late configuration changes are honoured.
      const configurations =
        options.oracledbConfigurations ?? config.get('oracledb')
      const healthcheckTimeoutMs = config.get('oracledbHealthcheck.timeoutMs')
      const ecsStopTimeoutMs = config.get('ecsStopTimeoutMs')
      const proxyUrl = config.get('httpProxy')

      const retryWindowMs = options.preflight?.retryWindowMs ?? 30_000
      const retryDelayMs = options.preflight?.retryDelayMs ?? 5_000
      const preflightTimeoutMs = options.preflight?.timeoutMs ?? null

      const closeMarginMs =
        options.shutdown?.closeMarginMs ?? POOL_CLOSE_MARGIN_MS

      /**
       * Phase 1 — validate EVERY pool configuration before creating ANY pool.
       * Configuration invalidity is the only thing allowed to abort here.
       */
      const { pools, warnings } = validateOracleDbConfigurations(
        configurations,
        { healthcheckTimeoutMs, ecsStopTimeoutMs, proxyUrl }
      )

      for (const warning of warnings) {
        server.logger.warn(warning)
      }

      /**
       * Phase 2 — create all pools. Thin-mode createPool does not dial the
       * database (Stage 1 verified: it resolves in ~1ms even when the target
       * is unreachable, with poolMin warm-up errors swallowed), so a
       * rejection here is config/attribute-class and aborts startup — after
       * closing anything already created, since the stop handler does not
       * exist yet.
       */
      for (const pool of pools) {
        const { attrs: proxyAttrs, warning: proxyWarning } = resolveProxy(
          proxyUrl,
          pool.tcps
        )

        if (proxyWarning) {
          server.logger.warn(`oracledb.${pool.key}: ${proxyWarning}`)
        }

        /** @type {oracledb.PoolAttributes} */
        const poolAttributes = {
          user: pool.config.username,
          password: pool.config.password,
          connectString: pool.connectString,
          poolMax: pool.config.poolMax,
          poolMin: pool.poolMin,
          poolTimeout: pool.config.poolTimeout,
          poolPingInterval: pool.config.poolPingInterval,
          expireTime: pool.config.expireTime,
          queueTimeout: pool.config.queueTimeoutMs,
          queueMax: pool.queueMax,
          poolAlias: pool.key,
          ...(proxyAttrs ?? {})
        }

        // Never log `password` (or the full attributes object).
        const { password, ...redactedPoolAttributes } = poolAttributes

        server.logger.debug(
          { poolAttributes: redactedPoolAttributes },
          `Creating OracleDB pool "${pool.key}" with attributes`
        )

        try {
          try {
            oracledb.getPool(pool.key)
          } catch (error) {
            if (
              !(/** @type {any} */ (error).code) ||
              /** @type {any} */ (error).code !== 'NJS-047'
            ) {
              throw error
            }

            await oracledb.createPool(poolAttributes)

            server.logger.info(`OracleDB pool created for "${pool.key}"`)
          }
        } catch (error) {
          server.logger.error(
            { err: error },
            `Failed to create OracleDB pool for "${pool.key}"`
          )

          await closePools(server, pools, closeMarginMs)

          throw error
        }
      }

      /**
       * Phase 3 — boot preflight: one bounded getConnection per pool. This is
       * the only layer where driver error codes surface (createPool swallows
       * warm-up failures), so it is where a bad rollout fails fast:
       *  - credential/privilege errors are fatal (fail the ECS deployment
       *    rather than lingering silently red — /health never reflects Oracle)
       *  - unknown-service (NJS-518) is retried across the retry window (a
       *    restarting database registers its service within seconds), then
       *    fatal
       *  - anything else is outage-class: log loudly and boot red
       *
       * Pools preflight CONCURRENTLY so total boot delay is bounded by the
       * slowest single pool (worst case ~retryWindowMs + one attempt), not
       * the sum across pools — sequential preflights could push boot past
       * the orchestrator's startup grace during an outage.
       *
       * @param {(typeof pools)[number]} pool
       */
      /**
       * A single GLOBAL budget caps the whole preflight phase. It is DERIVED
       * from configuration — one full attempt (so the driver's verdict always
       * wins classification, never a clamped app timer) plus the NJS-518
       * retry window plus margin. Because pools preflight concurrently and
       * the outage path returns after ONE attempt, a total outage delays boot
       * by a single configured attempt; only the 518 retry tail can consume
       * the rest of the budget. No attempt is ever clamped below its
       * configured window.
       */
      const attemptTimeoutFor = (pool) =>
        preflightTimeoutMs ??
        pool.config.queueTimeoutMs + PREFLIGHT_TIMEOUT_MARGIN_MS

      const maxAttemptMs = Math.max(
        ...pools.map((pool) => attemptTimeoutFor(pool))
      )

      const preflightBudgetMs =
        options.preflight?.budgetMs ?? maxAttemptMs + retryWindowMs + 5_000

      const phaseDeadline = Date.now() + preflightBudgetMs

      const preflightPool = async (pool) => {
        const deadline = Date.now() + retryWindowMs

        for (;;) {
          if (phaseDeadline - Date.now() < 500) {
            // Backstop only — the derived budget always covers a full first
            // attempt, so this can fire solely on retry tails or an
            // explicitly tiny injected budget.
            server.logger.error(
              { pool: pool.key },
              'OracleDB preflight budget exhausted — continuing with a red healthcheck (unverified, outage-class)'
            )
            return
          }

          const attempt = await preflightAttempt(
            pool.key,
            attemptTimeoutFor(pool),
            (lateError) => {
              /**
               * The race already timed out and boot moved on (outage-class).
               * If the abandoned attempt later settles with a
               * configuration-class error, a bad rollout has slipped past the
               * preflight window — aborting now would kill a serving process,
               * so make it maximally visible instead (the healthcheck keeps
               * reporting the same code every interval).
               */
              if (lateError && classifyPreflightError(lateError) === 'fatal') {
                server.logger.error(
                  { err: lateError, pool: pool.key },
                  'OracleDB preflight: abandoned attempt later settled with a CONFIGURATION-class error — this deployment likely has bad credentials/privileges and will stay red'
                )
              } else if (lateError) {
                server.logger.warn(
                  { err: lateError, pool: pool.key },
                  'OracleDB preflight: abandoned attempt later settled with an error'
                )
              } else {
                server.logger.info(
                  `OracleDB preflight: abandoned attempt for "${pool.key}" later succeeded — pool is reachable`
                )
              }
            }
          )

          if (attempt.ok) {
            server.logger.info(`OracleDB preflight succeeded for "${pool.key}"`)
            return
          }

          const classification = classifyPreflightError(attempt.error)

          if (classification === 'fatal') {
            server.logger.error(
              { err: attempt.error, pool: pool.key },
              'OracleDB preflight failed with a configuration-class error — aborting startup'
            )

            throw attempt.error
          }

          if (classification === 'unknown-service') {
            /**
             * Note: an attempt started just inside the window may run up to
             * queueTimeoutMs past it, so worst-case wall clock is
             * retryWindowMs + queueTimeoutMs before the eventual fatal.
             */
            if (
              Date.now() + retryDelayMs < deadline &&
              Date.now() + retryDelayMs < phaseDeadline
            ) {
              server.logger.warn(
                { err: attempt.error, pool: pool.key },
                'OracleDB preflight: service not registered with the listener — retrying (a restarting database registers within seconds)'
              )

              await sleep(retryDelayMs)

              continue
            }

            server.logger.error(
              { err: attempt.error, pool: pool.key },
              'OracleDB preflight: service still not registered after the retry window — aborting startup'
            )

            throw attempt.error
          }

          server.logger.error(
            {
              err: attempt.error,
              code: /** @type {any} */ (attempt.error)?.code,
              pool: pool.key
            },
            'OracleDB pool born unreachable — continuing with a red healthcheck (outage-class)'
          )

          return
        }
      }

      /**
       * Fast-fail: Promise.all rejects on the FIRST fatal preflight — a 10ms
       * ORA-01017 on one pool must not wait behind another pool's retry
       * window before failing the deployment. The catch handlers keep the
       * still-running tasks from becoming unhandledRejections (their trailing
       * logs during an already-failing boot are acceptable); rollback runs
       * exactly once, and closePools tolerates pools in any state.
       *
       * Worst-case SUCCESSFUL-boot delay is the slowest single pool:
       * ~retryWindowMs + one attempt (queueTimeoutMs) — ops must keep that
       * under the platform's startup grace when tuning those values.
       */
      const preflightTasks = pools.map((pool, index) =>
        preflightPool(pool).catch((error) => {
          server.logger.error(
            { err: error, pool: pools[index].key },
            'OracleDB preflight failed fatally (recorded; boot may already be aborting on another pool)'
          )
          throw error
        })
      )

      for (const task of preflightTasks) {
        task.catch(() => {})
      }

      try {
        await Promise.all(preflightTasks)
      } catch (error) {
        await closePools(server, pools, closeMarginMs)

        throw error
      }

      /**
       * Phase 4 — decorations + a single idempotent stop handler, only now
       * that every pool exists and has been preflighted.
       */
      for (const pool of pools) {
        server.decorate('server', `oracledb.${pool.key}`, async () => {
          const startTime = Date.now()
          const connection = await oracledb.getConnection(pool.key)

          server.logger.trace(
            `OracleDB connection established for "${pool.key}"`
          )

          const elapsedTime = Date.now() - startTime

          /**
           * record how long it took to establish the connection
           */
          connectionTime.record(elapsedTime, {
            connectionPool: pool.key
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
                  `Failed to close OracleDB connection for "${pool.key}"`
                )

                throw error
              } finally {
                /**
                 * record how long the connection was open for
                 */
                connectionDuration.record(duration, {
                  connectionPool: pool.key
                })
              }

              server.logger.trace(
                `OracleDB connection closed for "${pool.key}"`
              )
            }
          }
        })
      }

      server.events.on('stop', async () => {
        server.logger.info('Closing OracleDB pools')

        await closePools(server, pools, closeMarginMs)
      })
    }
  },
  /**
   * Pool configurations default from convict INSIDE register (no module-scope
   * snapshot); tests inject options.oracledbConfigurations explicitly.
   */
  options: {}
}
