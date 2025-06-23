import { describe, it, expect } from '@jest/globals'
import {
  HTTPException,
  HTTPExceptionCode,
  HTTPError,
  HTTPErrorCode
} from './http-exception.js'

describe('HTTPExceptionCode constants', () => {
  it('should map correct status codes', () => {
    expect(HTTPExceptionCode.BAD_REQUEST).toBe(400)
    expect(HTTPExceptionCode.NOT_FOUND).toBe(404)
    expect(HTTPExceptionCode.UNSUPPORTED_VERSION).toBe(404)
    expect(HTTPExceptionCode.INTERNAL_SERVER_ERROR).toBe(500)
  })
})

describe('HTTPError', () => {
  it('sets properties correctly with known code', () => {
    const attrs = { field: 'value' }
    const err = new HTTPError('MISSING_QUERY_PARAMETER', 'Missing param', attrs)
    expect(err.name).toBe('HTTPError')
    expect(err.code).toBe('MISSING_QUERY_PARAMETER')
    expect(err.message).toBe('Missing param')
    expect(err.attributes).toEqual(attrs)
    expect(err.statusCode).toBe(HTTPErrorCode.MISSING_QUERY_PARAMETER)
  })

  it('defaults to UNKNOWN statusCode for invalid code', () => {
    // @ts-expect-error - invalid code
    const err = new HTTPError('INVALID_CODE', 'Test')
    expect(err.statusCode).toBe(HTTPErrorCode.UNKNOWN)
  })

  it('toJSON returns correct representation', () => {
    const attrs = { detail: 'info' }
    const err = new HTTPError('DATABASE_ERROR', 'DB failed', attrs)
    expect(err.toJSON()).toEqual({
      code: 'DATABASE_ERROR',
      message: 'DB failed',
      detail: 'info'
    })
  })
})

describe('HTTPException', () => {
  it('constructs with no errors', () => {
    const exc = new HTTPException('BAD_REQUEST', 'Bad input')
    expect(exc.name).toBe('HTTPException')
    expect(exc.code).toBe('BAD_REQUEST')
    expect(exc.statusCode).toBe(HTTPExceptionCode.BAD_REQUEST)
    expect(exc.errors).toEqual([])
  })

  it('accepts an array of HTTPError instances', () => {
    const e1 = new HTTPError('UNKNOWN', 'Err1')
    const e2 = new HTTPError('DATABASE_ERROR', 'Err2')
    const exc = new HTTPException('NOT_FOUND', 'Not found', [e1, e2])
    expect(exc.errors).toEqual([e1, e2])
  })

  it('throws when non-HTTPError provided in constructor', () => {
    // @ts-expect-error - passing non-HTTPError
    expect(() => new HTTPException('BAD_REQUEST', 'Oops', [{}])).toThrow(
      TypeError
    )
  })

  describe('add()', () => {
    it('throws for non-Error arguments', () => {
      const exc = new HTTPException('BAD_REQUEST', 'Bad')
      // @ts-expect-error - passing non-Error
      expect(() => exc.add(123)).toThrow(TypeError)
    })

    it('adds HTTPError instances directly', () => {
      const exc = new HTTPException('BAD_REQUEST', 'Bad')
      const he = new HTTPError('DATABASE_ERROR', 'DB')
      exc.add(he)
      expect(exc.errors).toContain(he)
    })

    it('wraps generic Error in HTTPError with UNKNOWN code', () => {
      const exc = new HTTPException('BAD_REQUEST', 'Bad')
      const plain = new Error('Plain error')
      exc.add(plain)
      expect(exc.errors).toHaveLength(1)
      const wrapped = exc.errors[0]
      expect(wrapped).toBeInstanceOf(HTTPError)
      expect(wrapped.code).toBe('UNKNOWN')
      expect(wrapped.message).toBe('Plain error')
    })
  })

  describe('boomify()', () => {
    it('returns a Boom error with overridden payload', () => {
      const he = new HTTPError('MISSING_QUERY_PARAMETER', 'Missing')
      const exc = new HTTPException('BAD_REQUEST', 'Bad', [he])
      const boomErr = exc.boomify()

      expect(boomErr.isBoom).toBe(true)
      expect(boomErr.output.statusCode).toBe(HTTPExceptionCode.BAD_REQUEST)

      const payload = boomErr.output.payload
      expect(payload.code).toBe('BAD_REQUEST')
      expect(payload.errors).toEqual([he])
      expect(payload).not.toHaveProperty('error')
      expect(payload).not.toHaveProperty('statusCode')
    })
  })
})
