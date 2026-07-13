import Boom from '@hapi/boom'

import {
  HTTPException,
  httpExceptionCodeForStatus
} from '../../lib/http/http-exception.js'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 */

/**
 * Generic message used for every server (5xx) error so that internal detail —
 * e.g. an upstream error interpolated into an HTTPException message — is never
 * surfaced to clients. Mirrors the string Boom uses when it masks unexpected
 * errors.
 */
const SERVER_ERROR_MESSAGE = 'An internal server error occurred'

/**
 * Determines whether a Boom payload is already in the HTTPException envelope
 * shape — i.e. it carries a string `code` and an `errors` array. Hapi's default
 * error payload is `{ statusCode, error, message }`, so this only matches
 * payloads that have already been normalised (or produced by
 * `HTTPException.boomify`).
 *
 * @param {Record<string, unknown> | undefined} payload
 * @returns {boolean}
 */
function isEnvelopePayload(payload) {
  return (
    !!payload &&
    typeof payload.code === 'string' &&
    Array.isArray(payload.errors)
  )
}

/**
 * Hapi plugin that guarantees every error response shares the single
 * `HTTPException` envelope — `{ message, code, errors }` — regardless of where
 * the failure originated. Without it the API leaks at least three distinct
 * error shapes, so clients cannot parse errors with a single handler.
 *
 * Three error sources are reconciled in `onPreResponse`:
 *
 *  1. Application errors — an `HTTPException` thrown or returned from a handler.
 *     Hapi wraps a thrown non-Boom error as a generic 500 with its message
 *     hidden, so we re-`boomify()` it to restore the intended status code and
 *     the `{ message, code, errors }` envelope (preserving the rich `errors`
 *     list). Handlers that already returned `.boomify()` are unaffected because
 *     `boomify()` is idempotent.
 *
 *  2. Framework / parser errors — e.g. malformed JSON, which Hapi surfaces as a
 *     plain Boom `{ statusCode, error, message }`.
 *
 *  3. Auth / authorization errors — `Boom.unauthorized` / `Boom.forbidden`
 *     raised by the auth scheme.
 *
 * For (2) and (3) the Boom `output.payload` is rewritten in place into the
 * envelope while the HTTP status code and any response headers (e.g.
 * `WWW-Authenticate`) are preserved exactly.
 *
 * Server errors (5xx) always carry a generic message. Boom only masks the
 * message of *unexpected* errors (a bare `throw` or `Boom.badImplementation`),
 * not one explicitly passed to `Boom.serverUnavailable(...)` or an
 * `HTTPException`, so the message is sanitised here to ensure internal detail is
 * never leaked. The structured `code` and `errors` are preserved.
 */
export const errorEnvelope = {
  plugin: {
    name: 'errorEnvelope',
    version: '0.0.0',
    /**
     * @param {Server} server
     */
    register: (server) => {
      server.ext('onPreResponse', (request, h) => {
        const { response } = request

        // Successful responses are not Boom errors — leave them untouched.
        if (!Boom.isBoom(response)) {
          return h.continue
        }

        // (1) Application HTTPException: rebuild the canonical envelope and
        // restore the intended status code (Hapi may have masked a thrown or
        // returned HTTPException as a generic 500).
        if (response instanceof HTTPException) {
          response.boomify()

          // Never surface developer-provided detail on a server error.
          if (response.isServer) {
            response.output.payload.message = SERVER_ERROR_MESSAGE
          }

          return h.continue
        }

        const { statusCode, payload } = response.output

        // Defensive: never double-normalise an existing envelope payload.
        if (isEnvelopePayload(payload)) {
          return h.continue
        }

        // (2) / (3) Generic Boom error: rewrite the payload into the envelope,
        // preserving the original status code and response headers. The
        // envelope deliberately drops Boom's required { statusCode, error }
        // payload fields, so it is asserted past the `Payload` type.
        response.output.payload = /** @type {import('@hapi/boom').Payload} */ (
          /** @type {unknown} */ ({
            message:
              statusCode >= 500
                ? SERVER_ERROR_MESSAGE
                : (typeof payload?.message === 'string' && payload.message) ||
                  (typeof payload?.error === 'string' && payload.error) ||
                  'Error',
            code: httpExceptionCodeForStatus(statusCode),
            errors: []
          })
        )

        return h.continue
      })
    }
  }
}
