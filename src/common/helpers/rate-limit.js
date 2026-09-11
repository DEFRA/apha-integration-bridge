/**
 * @typedef {object} RateLimitInfo
 * @property {import('rate-limiter-flexible').RateLimiterRes} result - Rate limiter result
 * @property {number} limit - Maximum requests allowed
 * @property {boolean} exceeded - Whether rate limit was exceeded
 *
 * @typedef {import('../../types/api.js').HapiRequestWithRateLimit} HapiRequestWithRateLimit
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

import Boom from '@hapi/boom'
import {
  RateLimiterMemory,
  RateLimiterMongo,
  RateLimiterRes
} from 'rate-limiter-flexible'

import { config } from '../../config.js'

/**
 * @type {import('@hapi/hapi').Plugin<void>}
 */
export const rateLimitPlugin = {
  name: 'rate-limit',
  version: '1.0.0',

  register: async function (server) {
    const rateLimitConfig = config.get('rateLimit')
    const mongoConfig = config.get('mongo')

    const exemptPaths = ['/health']

    // `db` is decorated onto the server by the mongoDb plugin, which
    // createServer() registers before this one.
    const { db } = /** @type {import('../../types/api.js').ServerWithMongo} */ (
      server
    )

    const limiter = await createLimiter(
      rateLimitConfig,
      mongoConfig,
      db,
      server.logger
    )

    server.logger?.info(
      `Rate limiting enabled: ${rateLimitConfig.points} requests per ${rateLimitConfig.duration}s per client`
    )

    server.ext(
      'onPreHandler',
      /**
       * @param {HapiRequestWithRateLimit} request
       * @param {ResponseToolkit} h
       */
      async (request, h) => {
        const { path } = request

        // Skip rate limiting for exempt paths
        if (exemptPaths.some((p) => path.startsWith(p))) {
          return h.continue
        }

        const key = getClientKey(request)

        try {
          const result = await limiter.consume(key, 1)

          request.app.rateLimit = {
            result,
            limit: rateLimitConfig.points,
            exceeded: false
          }

          return h.continue
        } catch (rejection) {
          if (rejection instanceof RateLimiterRes) {
            request.app.rateLimit = {
              result: rejection,
              limit: rateLimitConfig.points,
              exceeded: true
            }

            throw Boom.tooManyRequests('Rate limit exceeded')
          }

          server.logger?.error(
            { err: rejection },
            'Rate limiter failed for both the MongoDB store and its in-memory fallback'
          )

          const unavailable = Boom.serverUnavailable(
            'Service temporarily unavailable'
          )
          unavailable.output.headers['Retry-After'] = String(
            rateLimitConfig.duration
          )
          throw unavailable
        }
      }
    )

    server.ext(
      'onPreResponse',
      /**
       * @param {HapiRequestWithRateLimit} request
       * @param {ResponseToolkit} h
       */
      (request, h) => {
        const rateLimitInfo = request.app.rateLimit

        if (!rateLimitInfo) {
          return h.continue
        }

        const response = request.response

        if (!response) {
          return h.continue
        }

        const { result, limit, exceeded } = rateLimitInfo

        // Calculate header values
        const remaining = Math.max(0, result.remainingPoints ?? 0)
        const reset = getRateLimitResetTime(result.msBeforeNext)

        // Handle both Boom errors and regular responses
        if (Boom.isBoom(response)) {
          response.output.headers['X-RateLimit-Limit'] = String(limit)
          response.output.headers['X-RateLimit-Remaining'] = String(remaining)
          response.output.headers['X-RateLimit-Reset'] = String(reset)

          if (exceeded) {
            response.output.headers['Retry-After'] = String(
              getRetryAfterSeconds(result.msBeforeNext)
            )
          }
        } else if (typeof response.header === 'function') {
          response.header('X-RateLimit-Limit', String(limit))
          response.header('X-RateLimit-Remaining', String(remaining))
          response.header('X-RateLimit-Reset', String(reset))

          if (exceeded) {
            response.header(
              'Retry-After',
              String(getRetryAfterSeconds(result.msBeforeNext))
            )
          }
        }

        return h.continue
      }
    )

    server.logger?.info('Rate limiting plugin registered successfully')
  }
}

/**
 * @param {object} rateLimitConfig - Rate limit configuration
 * @param {number} rateLimitConfig.points
 * @param {number} rateLimitConfig.duration
 * @param {object} mongoConfig - MongoDB configuration
 * @param {string} mongoConfig.uri
 * @param {string} mongoConfig.databaseName
 * @param {import('mongodb').Db} [db] - MongoDB database instance from server
 * @param {import('pino').Logger} [logger] - Optional logger instance
 */
async function createLimiter(rateLimitConfig, mongoConfig, db, logger) {
  if (!db) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('MongoDB database instance not available')
    }

    logger?.info('Using in-memory rate limiter for tests')
    return new RateLimiterMemory({
      points: rateLimitConfig.points,
      duration: rateLimitConfig.duration,
      blockDuration: 0
    })
  }

  const collection = db.collection('rate-limits')

  //  Drop old non-unique key_1 index if it exists
  try {
    const indexes = await collection.listIndexes().toArray()
    const keyIndex = indexes.find((idx) => idx.name === 'key_1')

    // If old non-unique index exists, drop it so library can create unique one
    if (keyIndex && !keyIndex.unique) {
      logger?.info(
        'Dropping non-unique key_1 index (will be recreated as unique)'
      )
      await collection.dropIndex('key_1')
      logger?.info('Successfully dropped old non-unique key_1 index')
    }
  } catch (err) {
    logger?.debug(
      { err },
      'Index check/cleanup completed (may have been handled by another container)'
    )
  }

  logger?.info('Ensuring TTL index on rate-limits collection')
  await ensureTtlIndex(collection, rateLimitConfig.duration * 2, logger)

  // rate-limiter-flexible falls back to this automatically when the Mongo
  // store errors. Counts per container, so during an outage a client's
  // effective limit is points * number of running pods.
  const insuranceLimiter = new RateLimiterMemory({
    points: rateLimitConfig.points,
    duration: rateLimitConfig.duration,
    blockDuration: 0
  })

  logger?.info('Initializing MongoDB rate limiter')
  return new RateLimiterMongoWithFallbackWarning(
    {
      storeClient: db,
      dbName: mongoConfig.databaseName,
      tableName: 'rate-limits',
      points: rateLimitConfig.points,
      duration: rateLimitConfig.duration,
      blockDuration: 0,
      insuranceLimiter
    },
    logger
  )
}

/**
 * RateLimiterMongo that logs once when a store operation fails and falls
 * through to the insurance limiter, so on-call knows Mongo is struggling.
 */
class RateLimiterMongoWithFallbackWarning extends RateLimiterMongo {
  /**
   * @param {ConstructorParameters<typeof RateLimiterMongo>[0]} opts
   * @param {import('pino').Logger} [logger]
   */
  constructor(opts, logger) {
    super(opts)
    this._logger = logger
    this._fallbackWarned = false
  }

  _upsert(...args) {
    // @ts-ignore - _upsert is a private method rate-limiter-flexible doesn't declare in its types, but it's the only hook point for a Mongo store failure
    return super._upsert(...args).catch((err) => {
      if (!this._fallbackWarned) {
        this._fallbackWarned = true
        this._logger?.warn(
          { err },
          'MongoDB rate limiter store failed; falling back to in-memory rate limiting until Mongo recovers'
        )
      }

      throw err
    })
  }
}

/**
 * expireAfterSeconds is derived from config, so a duration change can leave
 * an index on disk with different options - Mongo refuses to create an
 * index that already exists with different options, so drop and recreate
 * it rather than fail the boot.
 * @param {import('mongodb').Collection} collection
 * @param {number} expireAfterSeconds
 * @param {import('pino').Logger} [logger]
 */
async function ensureTtlIndex(collection, expireAfterSeconds, logger) {
  let existing

  try {
    const indexes = await collection.listIndexes().toArray()
    existing = indexes.find((idx) => idx.name === 'expire_1')
  } catch (err) {
    // Collection doesn't exist yet - listIndexes errors instead of
    // returning an empty list; createIndex below creates it.
    logger?.debug(
      { err },
      'Could not list indexes on rate-limits collection (likely does not exist yet)'
    )
  }

  if (existing && existing.expireAfterSeconds === expireAfterSeconds) {
    return
  }

  if (existing) {
    logger?.info(
      `Rate limit duration changed; recreating TTL index (expiry ${existing.expireAfterSeconds}s -> ${expireAfterSeconds}s)`
    )

    try {
      await collection.dropIndex('expire_1')
    } catch (err) {
      logger?.debug(
        { err },
        'Drop of expire_1 index failed (may have already been recreated by another container)'
      )
    }
  }

  await collection.createIndex(
    { expire: 1 },
    { expireAfterSeconds, background: true }
  )
}

/**
 * Extract the client key for rate limiting from the request
 * Priority: client_id from JWT > credentials.id > IP address
 * @param {import('@hapi/hapi').Request} request
 */
function getClientKey(request) {
  let key = request.info.remoteAddress

  // Check for client_id in JWT artifacts (real auth plugin)
  if (
    request.auth.artifacts &&
    typeof request.auth.artifacts.client_id === 'string'
  ) {
    key = request.auth.artifacts.client_id
  }
  // Fallback to credentials.id (for mock auth in tests)
  else if (
    request.auth.credentials &&
    typeof request.auth.credentials.id === 'string'
  ) {
    key = request.auth.credentials.id
  }

  return key
}

/**
 * @param {number} msBeforeNext
 * @returns {number} Unix timestamp
 */
function getRateLimitResetTime(msBeforeNext) {
  return Math.ceil((Date.now() + Math.max(0, msBeforeNext || 0)) / 1000)
}

/**
 * @param {number} msBeforeNext
 * @returns {number} Seconds to wait
 */
function getRetryAfterSeconds(msBeforeNext) {
  return Math.ceil(Math.max(0, msBeforeNext || 0) / 1000)
}
