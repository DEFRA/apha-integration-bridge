import Joi from 'joi'
import { Buffer } from 'buffer'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../lib/http/http-exception.js'
import { config } from '../../config.js'

/**
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseObject} ResponseObject
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

const CognitoTokenResponseSchema = Joi.object({
  access_token: Joi.string().required(),
  token_type: Joi.string().required(),
  expires_in: Joi.number().required()
})
  .description('Cognito access token response')
  .label('Cognito Token Response')

const TokenRequestPayloadSchema = Joi.object({
  grant_type: Joi.string().valid('client_credentials').required(),
  client_id: Joi.string().required(),
  client_secret: Joi.string().required()
})

/**
 * Handler for obtaining Cognito access tokens
 *
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<ResponseObject>}
 */
async function handler(request, h) {
  const payload =
    /** @type {{ grant_type: string, client_id: string, client_secret: string }} */ (
      request.payload
    )
  /* eslint-disable camelcase */
  const { grant_type, client_id, client_secret } = payload

  const cognitoUrl = config.get('cognito.tokenUrl')

  if (!cognitoUrl) {
    throw new HTTPException(
      'INTERNAL_SERVER_ERROR',
      'Cognito token URL is not configured. This endpoint is only available in lower environments.'
    )
  }

  // Encode credentials for Basic Authentication
  const credentials = `${client_id}:${client_secret}`
  const encodedCredentials = Buffer.from(credentials).toString('base64')

  try {
    const response = await fetch(cognitoUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type, client_id, client_secret })
    })

    if (!response.ok) {
      const errorText = await response.text()
      request.logger.error(
        { status: response.status, error: errorText },
        'Cognito token request failed'
      )
      throw new HTTPException(
        'BAD_REQUEST',
        `Failed to fetch token: ${response.status} ${errorText}`
      )
    }

    const data = await response.json()

    request.logger.info({ client_id }, 'Successfully obtained Cognito token')

    return h.response(data).code(200)
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    const err = /** @type {Error} */ (error)
    request.logger.error({ error: err.message }, 'Error fetching token')
    throw new HTTPException(
      'INTERNAL_SERVER_ERROR',
      `Error communicating with Cognito: ${err.message}`
    )
  }
  /* eslint-enable camelcase */
}

const options = {
  auth: false,
  tags: ['api', 'auth'],
  description:
    'Obtain Cognito access token using client credentials (Lower environments only)',
  notes: `
This endpoint is a convenience proxy to Cognito's OAuth2 token endpoint.
It is **only available in local and dev environments** to help developers
easily obtain access tokens for testing.

**Usage:**
1. Provide your \`client_id\` and \`client_secret\`
2. Set \`grant_type\` to \`client_credentials\`
3. The endpoint will return a Cognito access token
4. Use the \`access_token\` from the response in the "Authorize" button above

**Note:** This endpoint is disabled in production environments.
`,
  plugins: {
    'hapi-swagger': {
      id: 'oauth2-token',
      security: [],
      payloadType: 'form'
    }
  },
  validate: {
    payload: TokenRequestPayloadSchema,
    headers: Joi.object({
      'content-type': Joi.string()
        .valid('application/x-www-form-urlencoded')
        .default('application/x-www-form-urlencoded')
        .description('Content-Type must be application/x-www-form-urlencoded')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: CognitoTokenResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const isEnabled = config.get('cognito.isTokenEndpointEnabled')

export default isEnabled ? { method: 'POST', handler, options } : null
