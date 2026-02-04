/**
 * User context extraction utilities for JWT-based authentication.
 * @param {import('@hapi/hapi').Request} request
 */
export function getUserEmail(request) {
  // Check if request is authenticated
  if (!request.auth?.isAuthenticated || !request.auth?.artifacts) {
    request.logger?.warn('Request is not authenticated or missing JWT artifacts')
    return null
  }

  const artifacts = request.auth.artifacts

  const email =
    artifacts.upn ||
    artifacts.unique_name

  if (!email || typeof email !== 'string') {
    request.logger?.warn('No email claim found in JWT token', {
      availableClaims: Object.keys(artifacts)
    })
    return null
  }

  request.logger?.debug('Extracted user email from JWT', {
    email,
  })

  return email
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

  return (
    artifacts.given_name && artifacts.family_name
      ? `${artifacts.given_name} ${artifacts.family_name}`
      : null
  )
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
