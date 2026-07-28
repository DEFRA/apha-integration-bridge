import Boom from '@hapi/boom'
import Joi from 'joi'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../lib/http/http-exception.js'

import { loadDocumentation } from '../../common/helpers/documentation.js'
import { metricsCounter } from '../../common/helpers/metrics.js'
import { SamApiError } from '../../lib/sam/client.js'
import { SamResponseSchema, SamErrorSchema } from '../../lib/sam/schemas.js'
import { StandardWorkSchema } from '../../types/workorders.js'
import { samClient } from '../../lib/sam/index.js'

const __dirname = new URL('.', import.meta.url).pathname

const documentationNotes = loadDocumentation(__dirname, 'activity.md')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'workorders'],
  description:
    'Update and resolve a work schedule activity in the Sam standardwork API',
  notes: documentationNotes,
  plugins: {
    'hapi-swagger': {
      id: 'workorders-activity-update',
      security: [{ Bearer: [] }]
    }
  },
  ext: {
    // Scope check runs after auth but before payload validation, so clients
    // without `write` get a 401 whatever they send (no schema probing).
    // Malformed JSON still 400s first — hapi parses the body before this.
    // The `?? []` keeps it fail-closed (401, not a TypeError 500) if the
    // scopes plugin ever isn't registered.
    onPostAuth: {
      method: (request, h) => {
        const scopes =
          /** @type {import('../../types/api.js').HapiRequestWithScopes} */ (
            request
          ).app.scopes ?? []

        if (!scopes.includes('write')) {
          throw Boom.unauthorized('Missing write scope')
        }

        return h.continue
      }
    }
  },
  validate: {
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning'),
      'Content-Type': Joi.string().allow('application/json')
    }).options({ allowUnknown: true }),
    payload: StandardWorkSchema,
    failAction: HTTPException.failValidation
  },
  response: {
    // Docs only — response validation is off. Hapi validates responses
    // before errorEnvelope rewrites Boom payloads, so declared 401/503
    // schemas would turn legitimate errors into 500s. failAction: 'log'
    // would be worse: the Joi error carries the full original body
    // (`_original`), which hapi-pino would happily log — and Sam messages
    // contain email addresses.
    sample: 0,
    status: {
      200: SamResponseSchema,
      401: HTTPExceptionSchema,
      403: SamErrorSchema,
      405: SamErrorSchema,
      409: SamErrorSchema,
      502: HTTPExceptionSchema,
      503: HTTPExceptionSchema,
      '400-500': Joi.alternatives()
        .try(SamErrorSchema, HTTPExceptionSchema)
        .label('Sam Error or HTTP Exception')
    }
  }
}

/**
 * @param {import('../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
export async function handler(request, h) {
  /**
   * only supported API version is 1.0
   */
  if (request.pre.apiVersion >= 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  if (!samClient.isConfigured()) {
    request.logger.error(
      'SAM write API is not configured: SAM_API_BASE_URL is not set'
    )

    return Boom.serverUnavailable()
  }

  /**
   * Already validated by StandardWorkSchema, so the identifiers are present.
   * @type {Record<string, unknown>}
   */
  const payload = /** @type {any} */ (request.payload)

  try {
    const { statusCode, body } = await samClient.updateStandardActivity(
      payload,
      request.logger
    )

    await metricsCounter('samWriteRequest', 1, { outcome: 'success' })

    // Serialise ourselves: h.response() is value-typed, so a JSON string
    // would go out unquoted as text/html and null as an empty body.
    // Stringifying keeps the pass-through faithful for every JSON value
    // Sam can send.
    return h
      .response(JSON.stringify(body))
      .type('application/json')
      .code(statusCode)
  } catch (error) {
    if (error instanceof SamApiError) {
      // Ids and codes only — the write api's message/field_errors can contain email
      // addresses, and the payload definitely does.
      request.logger.error(
        {
          workscheduleid: payload.workscheduleid,
          workscheduleactivityid: payload.workscheduleactivityid,
          statusCode: error.statusCode,
          samCode: error.samCode,
          uid: error.uid
        },
        'SAM write request failed'
      )

      await metricsCounter('samWriteRequest', 1, { outcome: 'upstreamError' })

      return Boom.badGateway()
    }

    // Anything else is our misconfiguration, not Sam's fault: count it,
    // log something attributable, and rethrow so hapi masks it as a 500
    // instead of us blaming the gateway with a 502.
    request.logger.error(
      {
        workscheduleid: payload.workscheduleid,
        workscheduleactivityid: payload.workscheduleactivityid
      },
      'SAM write could not be attempted: the bridge is misconfigured'
    )

    await metricsCounter('samWriteRequest', 1, { outcome: 'bridgeError' })

    throw error
  }
}

export default {
  method: 'PATCH',
  options,
  handler
}
