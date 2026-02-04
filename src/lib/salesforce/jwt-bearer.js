import { SignJWT, importPKCS8 } from 'jose'
import { config } from '../../config.js'

/**
 * Builds a JWT assertion for Salesforce OAuth 2.0 JWT Bearer flow.
 *
 * @see https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm
 *
 * @param {string} userEmail
 * @param {Object} [logger]
 */
export async function buildJWTAssertion(userEmail, logger) {
  // Cast config to any first to prevent TypeScript from performing deep type instantiation
  const configAny = /** @type {any} */ (config)
  const salesforceConfig = configAny.get('salesforce')
  const consumerKey = salesforceConfig.jwt?.consumerKey
  const privateKeyBase64 = salesforceConfig.jwt?.privateKey
  const audience = salesforceConfig.authUrl || salesforceConfig.baseUrl

  if (!consumerKey) {
    throw new Error('SALESFORCE_JWT_CONSUMER_KEY is not configured')
  }

  if (!privateKeyBase64) {
    throw new Error('SALESFORCE_JWT_PRIVATE_KEY is not configured')
  }

  if (!audience) {
    throw new Error('Salesforce auth URL or base URL is not configured')
  }

  if (!userEmail) {
    throw new Error('User email is required for JWT assertion')
  }

  try {
    // Decode the base64-encoded private key
    const privateKeyPEM = Buffer.from(privateKeyBase64, 'base64').toString(
      'utf8'
    )

    // Import the private key
    const privateKey = await importPKCS8(privateKeyPEM, 'RS256')

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(consumerKey)
      .setSubject(userEmail)
      .setAudience(audience)
      .setExpirationTime('3m') // 3 minutes expiry
      .setIssuedAt()
      .sign(privateKey)

    logger?.debug('JWT assertion created successfully', {
      subject: userEmail,
      audience,
      issuer: consumerKey
    })

    return jwt
  } catch (error) {
    logger?.error({ err: error }, 'Failed to build JWT assertion')
    throw new Error(`Failed to build JWT assertion: ${error.message}`)
  }
}

/**
 * Exchanges a JWT assertion for a Salesforce access token.
 *
 * @param {string} jwtAssertion - The signed JWT assertion
 * @param {Object} [logger] - Optional logger instance
 * @returns {Promise<Object>} The Salesforce token response
 */
export async function exchangeJWTForToken(jwtAssertion, logger) {
  // Cast config to any first to prevent TypeScript from performing deep type instantiation
  const configAny = /** @type {any} */ (config)
  const salesforceConfig = configAny.get('salesforce')
  const authUrl = salesforceConfig.authUrl

  if (!authUrl) {
    throw new Error('Salesforce auth URL is not configured')
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtAssertion
    })

    logger?.debug('Exchanging JWT assertion for access token', {
      authUrl
    })

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger?.error(
        {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        },
        'Failed to exchange JWT for access token'
      )
      throw new Error(
        `Failed to exchange JWT: ${response.status} ${response.statusText} - ${errorBody}`
      )
    }

    const tokenResponse = await response.json()

    logger?.debug('Successfully exchanged JWT for access token', {
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in
    })

    return tokenResponse
  } catch (error) {
    logger?.error({ err: error }, 'Error during JWT token exchange')
    throw error
  }
}

/**
 * Authenticates as a specific user using JWT Bearer flow.
 * This is the main entry point for JWT-based authentication.
 *
 * @param {string} userEmail - The Salesforce username (email) to authenticate as
 * @param {Object} [logger] - Optional logger instance
 * @returns {Promise<Object>} The Salesforce token response containing access_token
 */
export async function authenticateWithJWT(userEmail, logger) {
  logger?.debug('Starting JWT Bearer authentication', { userEmail })

  const jwtAssertion = await buildJWTAssertion(userEmail, logger)
  const tokenResponse = await exchangeJWTForToken(jwtAssertion, logger)

  return tokenResponse
}
