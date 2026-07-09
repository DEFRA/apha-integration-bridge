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
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'

import { config } from '../../config.js'
import { buildRedisClient } from './redis-client.js'

/**
 * @type {import('@hapi/hapi').Plugin<void>}
 */
export const rateLimitPlugin = {
  name: 'rate-limit',
  version: '1.0.0',

  register: async function (server) {
    const rateLimitConfig = config.get('rateLimit')
    const redisConfig = config.get('redis')

    const exemptPaths = ['/health']

    const limiter = await createLimiter(
      rateLimitConfig,
      redisConfig,
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
        } catch (rateLimitResult) {
          request.app.rateLimit = {
            result: rateLimitResult,
            limit: rateLimitConfig.points,
            exceeded: true
          }

          throw Boom.tooManyRequests('Rate limit exceeded')
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
 * @param {object} redisConfig - Redis configuration
 * @param {string} redisConfig.host
 * @param {number} redisConfig.port
 * @param {string} redisConfig.username
 * @param {string} redisConfig.password
 * @param {string} redisConfig.keyPrefix
 * @param {boolean} redisConfig.useSingleInstanceCache
 * @param {boolean} redisConfig.useTLS
 * @param {number} redisConfig.db
 * @param {object} [logger] - Optional logger instance
 */
async function createLimiter(rateLimitConfig, redisConfig, logger) {
  const isTest = process.env.NODE_ENV === 'test'

  // Use in-memory limiter for tests, Redis for production/development
  if (isTest) {
    logger?.info('Using in-memory rate limiter for tests')
    return new RateLimiterMemory({
      points: rateLimitConfig.points,
      duration: rateLimitConfig.duration,
      blockDuration: 0
    })
  }

  try {
    const redisClient = buildRedisClient(redisConfig, logger)

    // Test the connection
    await redisClient.ping()

    return new RateLimiterRedis({
      storeClient: redisClient,
      points: rateLimitConfig.points,
      duration: rateLimitConfig.duration,
      blockDuration: 0,
      keyPrefix: redisConfig.keyPrefix
    })
  } catch (error) {
    logger?.error(
      { err: error },
      'Failed to connect to Redis, falling back to in-memory rate limiter'
    )
    return new RateLimiterMemory({
      points: rateLimitConfig.points,
      duration: rateLimitConfig.duration,
      blockDuration: 0
    })
  }
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
