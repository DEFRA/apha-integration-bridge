import { describe, test, expect } from '@jest/globals'
import { HTTPResponse } from './http-response.js'

describe('HTTPResponse', () => {
  test('should correctly assign type, id, and attributes', () => {
    const type = 'card'
    const id = 'abc123'
    const attributes = { name: 'Pikachu', power: 9001 }

    const response = new HTTPResponse(type, id, attributes)

    expect(response.type).toBe(type)
    expect(response.id).toBe(id)
    expect(response.attributes).toEqual(attributes)
  })

  test('toJSON() should return properly structured object', () => {
    const response = new HTTPResponse('user', 42, { username: 'alice' })

    expect(response.toJSON()).toEqual({
      data: {
        type: 'user',
        id: 42,
        attributes: { username: 'alice' }
      }
    })
  })

  test('should handle null attributes', () => {
    const response = new HTTPResponse('item', 'xyz', null)

    expect(response.toJSON()).toEqual({
      data: {
        type: 'item',
        id: 'xyz',
        attributes: null
      }
    })
  })

  test('should handle undefined id and attributes', () => {
    const response = new HTTPResponse('thing', undefined, undefined)

    expect(response.toJSON()).toEqual({
      data: {
        type: 'thing',
        id: undefined,
        attributes: undefined
      }
    })
  })
})
