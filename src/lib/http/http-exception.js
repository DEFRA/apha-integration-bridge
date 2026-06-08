import Joi from 'joi'
import { boomify } from '@hapi/boom'

export const HTTPExceptionCode = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNSUPPORTED_VERSION: 404,
  DUPLICATE_RESOURCES_FOUND: 409,
  INTERNAL_SERVER_ERROR: 500
}

/**
 * Reverse lookup used to normalise arbitrary Boom errors (framework, parser and
 * auth failures) into the HTTPException envelope. Maps an HTTP status code onto
 * a stable `code` string so that every error response shares the same
 * vocabulary regardless of where the failure originated.
 */
const STATUS_CODE_TO_HTTP_EXCEPTION_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  406: 'NOT_ACCEPTABLE',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  501: 'NOT_IMPLEMENTED',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT'
}

/**
 * Maps an HTTP status code onto the closest HTTPException `code` string.
 *
 * Unlisted statuses fall back by class: any other 5xx becomes
 * `INTERNAL_SERVER_ERROR`, any other 4xx becomes `BAD_REQUEST`, and anything
 * else becomes `UNKNOWN`.
 *
 * @param {number} statusCode
 * @returns {string}
 */
export function httpExceptionCodeForStatus(statusCode) {
  const mapped = STATUS_CODE_TO_HTTP_EXCEPTION_CODE[statusCode]

  if (mapped) {
    return mapped
  }

  if (statusCode >= 500) {
    return 'INTERNAL_SERVER_ERROR'
  }

  if (statusCode >= 400) {
    return 'BAD_REQUEST'
  }

  return 'UNKNOWN'
}

export const HTTPExceptionSchema = Joi.object({
  message: Joi.string()
    .required()
    .description('A human-readable error message'),
  code: Joi.string().required().description('The error code'),
  errors: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required().description('The error code'),
        message: Joi.string()
          .required()
          .description('A human-readable error message')
      })
        .description('A HTTP error that triggered the HTTP Exception response')
        .label('HTTP Error')
    )
    .description('One ore more errors that triggered the HTTP exception')
    .label('HTTP Exceptions List')
})
  .description(
    'A well-structured HTTP error response, containing one or more errors'
  )
  .label('HTTP Exception')

export class HTTPException extends Error {
  /**
   *
   * @param {keyof HTTPExceptionCode} code
   * @param {string} message
   * @param {HTTPError[]} [errors=[]]
   */
  constructor(code, message, errors = []) {
    super(message)

    this.name = 'HTTPException'

    this.code = code

    this.statusCode =
      HTTPExceptionCode[code] || HTTPExceptionCode.INTERNAL_SERVER_ERROR

    this.errors = []

    for (const error of errors) {
      if (!(error instanceof HTTPError)) {
        throw new TypeError('Expected an instance of HTTPError')
      }

      this.errors.push(error)
    }
  }

  /**
   *
   * @param {Error | HTTPError} error
   */
  add(error) {
    if (!(error instanceof Error)) {
      throw new TypeError('Expected an instance of Error or HTTPError')
    }

    if (error instanceof HTTPError) {
      this.errors.push(error)

      return
    }

    this.errors.push(new HTTPError('UNKNOWN', error.message))
  }

  boomify() {
    const boom = boomify(this, {
      statusCode: this.statusCode,
      override: true
    })

    Object.assign(boom.output.payload, {
      message: this.message,
      code: this.code,
      errors: this.errors
    })

    delete boom.output.payload.statusCode
    delete boom.output.payload.error

    return boom
  }

  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} _h
   * @param {Error} error
   */
  static failValidation(request, _h, error) {
    if (!(error instanceof Joi.ValidationError)) {
      throw error
    }

    return new HTTPException('BAD_REQUEST', 'Invalid request parameters', [
      new HTTPError('VALIDATION_ERROR', error.message, {
        ...request.params
      })
    ]).boomify()
  }
}

export const HTTPErrorCode = {
  UNKNOWN: 'UNKNOWN',
  DATABASE_ERROR: 'DATABASE_ERROR',
  MISSING_QUERY_PARAMETER: 'MISSING_QUERY_PARAMETER',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  CASE_NOT_FOUND: 'CASE_NOT_FOUND'
}

export class HTTPError extends Error {
  /**
   *
   * @param {keyof HTTPErrorCode} code
   * @param {string} message
   * @param {Record<string, unknown>} [attributes={}]
   */
  constructor(code, message, attributes = {}) {
    super(message)

    this.name = 'HTTPError'

    this.code = code

    this.statusCode = HTTPErrorCode[code] || HTTPErrorCode.UNKNOWN

    this.attributes = attributes
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...this.attributes
    }
  }
}
