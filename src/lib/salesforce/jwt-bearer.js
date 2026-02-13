import { SignJWT, importPKCS8 } from 'jose'
import { config } from '../../config.js'

/**
 * @import {Logger} from 'pino'
 */

/**
 * Builds a JWT assertion for Salesforce OAuth 2.0 JWT Bearer flow.
 *
 * @see https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm
 *
 * @param {string} userEmail
 * @param {Logger} [logger]
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
    const privateKeyPEM = Buffer.from(privateKeyBase64, 'base64').toString(
      'utf8'
    )

    const privateKey = await importPKCS8(privateKeyPEM, 'RS256')

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(consumerKey)
      .setSubject(userEmail)
      .setAudience(audience)
      .setExpirationTime('3m') // 3 minutes expiry
      .setIssuedAt()
      .sign(privateKey)

    return jwt
  } catch (error) {
    logger?.error({ err: error }, 'Failed to build JWT assertion')
    throw new Error(`Failed to build JWT assertion: ${error.message}`)
  }
}
