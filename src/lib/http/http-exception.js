import { boomify } from '@hapi/boom'

export const HTTPExceptionCode = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNSUPPORTED_VERSION: 404,
  INTERNAL_SERVER_ERROR: 500
}

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
}

export const HTTPErrorCode = {
  UNKNOWN: 'UNKNOWN',
  DATABASE_ERROR: 'DATABASE_ERROR',
  MISSING_QUERY_PARAMETER: 'MISSING_QUERY_PARAMETER'
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
