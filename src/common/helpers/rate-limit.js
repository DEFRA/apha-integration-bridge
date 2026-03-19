/**
 * @typedef {object} RateLimitInfo
 * @property {import('rate-limiter-flexible').RateLimiterRes} result - Rate limiter result
 * @property {number} limit - Maximum requests allowed
 * @property {boolean} exceeded - Whether rate limit was exceeded
 */

import Boom from '@hapi/boom'
import { RateLimiterMemory } from 'rate-limiter-flexible'

import { config } from '../../config.js'
import { meter } from '../../lib/telemetry/index.js'

/**
 * @type {import('@hapi/hapi').Plugin<void>}
 */
export const rateLimitPlugin = {
  name: 'rate-limit',
  version: '1.0.0',

  register: async function (server) {
    const rateLimitConfig = config.get('rateLimit')

    const exemptPaths = ['/health']

    const limiter = createLimiter(rateLimitConfig)

    server.logger?.info(
      `Rate limiting enabled: ${rateLimitConfig.burstLimit} requests, refilling at ${rateLimitConfig.ratePerSecond}/sec`
    )

    const requestsCounter = meter.createCounter('ratelimit.requests.total', {
      description: 'Total number of requests checked against rate limits'
    })
    const exceededCounter = meter.createCounter('ratelimit.exceeded.total', {
      description: 'Total number of requests that exceeded rate limits'
    })
    const bypassedCounter = meter.createCounter('ratelimit.bypassed.total', {
      description: 'Total number of requests that bypassed rate limits'
    })

    server.ext('onPreHandler', async (request, h) => {
      const { path, method } = request

      // Skip rate limiting for exempt paths
      if (exemptPaths.some((p) => path.startsWith(p))) {
        bypassedCounter.add(1, { reason: 'exempt_path', path, method })
        return h.continue
      }

      requestsCounter.add(1, { path, method })
      const key = getClientKey(request)

      try {
        const result = await limiter.consume(key, 1)

        request.app.rateLimit = {
          result,
          limit: rateLimitConfig.burstLimit,
          exceeded: false
        }

        return h.continue
      } catch (rateLimitResult) {
        exceededCounter.add(1, { path, method })

        // @ts-ignore - Extending request.app with custom property
        request.app.rateLimit = {
          result: rateLimitResult,
          limit: rateLimitConfig.burstLimit,
          exceeded: true
        }

        throw Boom.tooManyRequests('Rate limit exceeded')
      }
    })

    server.ext('onPreResponse', (request, h) => {
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
      if (response.isBoom) {
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
    })

    server.logger?.info('Rate limiting plugin registered successfully')
  }
}

/**
 * @param {object} config - Rate limit configuration
 * @param {number} config.burstLimit
 * @param {number} config.ratePerSecond
 */
function createLimiter(config) {
  return new RateLimiterMemory({
    points: config.burstLimit,
    duration: 1,
    blockDuration: 0
  })
}

/**
 * @param {import('@hapi/hapi').Request} request
 */
function getClientKey(request) {
  let key = request.info.remoteAddress
  if (
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
