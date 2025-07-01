import Joi from 'joi'
import { boomify } from '@hapi/boom'

export const HTTPExceptionCode = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNSUPPORTED_VERSION: 404,
  INTERNAL_SERVER_ERROR: 500
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
  VALIDATION_ERROR: 'VALIDATION_ERROR'
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
