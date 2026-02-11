/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {string | null} User email or null if not authenticated
 */
export function getUserEmail(request) {
  // First, try to extract from X-Forwarded-Authorization header
  const forwardedAuth = request.headers['x-forwarded-authorization']

  if (forwardedAuth) {
    const email = extractEmailFromForwardedAuth(forwardedAuth, request.logger)
    if (email) {
      request.logger?.debug(
        'Extracted user email from X-Forwarded-Authorization',
        {
          email
        }
      )
      return email
    }
  }

  // Fall back to standard authentication artifacts
  if (!request.auth?.isAuthenticated || !request.auth?.artifacts) {
    request.logger?.debug(
      'Request is not authenticated and no X-Forwarded-Authorization header present'
    )
    return null
  }

  const artifacts = request.auth.artifacts

  const email = artifacts.upn || artifacts.unique_name

  if (!email || typeof email !== 'string') {
    request.logger?.warn('No email claim found in JWT token', {
      availableClaims: Object.keys(artifacts)
    })
    return null
  }

  request.logger?.debug('Extracted user email from standard auth artifacts', {
    email
  })

  return email
}

/**
 * @param {string} authHeader - The X-Forwarded-Authorization header value
 * @param {import('pino').Logger} [logger] - Optional logger
 * @returns {string | null} Email address or null if not found
 */
function extractEmailFromForwardedAuth(authHeader, logger) {
  try {
    // Remove "Bearer " prefix if present
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const parts = token.split('.')
    if (parts.length !== 3) {
      logger?.warn('Invalid JWT format in X-Forwarded-Authorization header')
      return null
    }

    // Decode payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    )

    // Try different email claim names
    // Azure AD: upn, unique_name
    // Customer Identity: email, sub
    const email =
      payload.email ||
      payload.upn ||
      payload.unique_name ||
      payload.preferred_username

    if (!email || typeof email !== 'string') {
      logger?.warn('No email claim found in X-Forwarded-Authorization JWT', {
        availableClaims: Object.keys(payload)
      })
      return null
    }

    return email
  } catch (error) {
    logger?.error(
      { err: error },
      'Failed to extract email from X-Forwarded-Authorization header'
    )
    return null
  }
}

/**
 * Extracts the user's full name from an authenticated request's JWT token.
 *
 * @param {import('@hapi/hapi').Request} request - The Hapi request object
 */
export function getUserName(request) {
  if (!request.auth?.isAuthenticated || !request.auth?.artifacts) {
    return null
  }

  const artifacts = request.auth.artifacts

  return artifacts.given_name && artifacts.family_name
    ? `${artifacts.given_name} ${artifacts.family_name}`
    : null
}

/**
 * Gets all available user context information from the JWT token.
 *
 * @param {import('@hapi/hapi').Request} request - The Hapi request object
 */
export function getUserContext(request) {
  if (!request.auth?.isAuthenticated || !request.auth?.artifacts) {
    return null
  }

  return {
    email: getUserEmail(request),
    name: getUserName(request),
    raw: request.auth.artifacts
  }
}
