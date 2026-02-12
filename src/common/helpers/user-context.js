import { decodeJwt } from 'jose'
import { createLogger } from './logging/logger.js'

const logger = createLogger()

/**
 * Extracts user email from X-Forwarded-Authorization header.
 * This is used for user-context aware endpoints.
 * @param {import('@hapi/hapi').Request} request
 * @returns {string | null} User email or null if not present
 */
export function getUserEmail(request) {
  const forwardedAuth = request.headers['x-forwarded-authorization']

  if (!forwardedAuth) {
    return null
  }

  try {
    const token = forwardedAuth.replace(/^Bearer\s+/i, '')
    const payload = decodeJwt(token)
    const email = payload.email

    if (!email || typeof email !== 'string') {
      logger.warn('No email claim found in X-Forwarded-Authorization JWT')
      return null
    }

    return email
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to extract email from X-Forwarded-Authorization header'
    )
    return null
  }
}
