import { describe, expect, test } from '@jest/globals'
import Joi from 'joi'

import { HTTPObjectResponse } from './http-response.js'
import { HTTPFindRequest } from './http-find-request.js'

const schemaFor = (type) =>
  Joi.object({
    type: Joi.string().valid(type).required(),
    id: Joi.string().required()
  }).meta({ response: { type } })

describe('HTTPFindRequest', () => {
  test('exposes deduplicated paged ids from payload', () => {
    const req = new HTTPFindRequest(
      /** @type {any} */ ({
        url: 'http://localhost/customers/find?page=1&pageSize=2',
        query: { page: 1, pageSize: 2 },
        payload: { ids: ['a', 'b', 'a', 'c'] }
      }),
      schemaFor('customers')
    )

    expect(req.ids).toEqual(['a', 'b'])
    expect(req.distinctIds).toEqual(['a', 'b', 'c'])
    expect(req.page).toBe(1)
    expect(req.pageSize).toBe(2)
    expect(req.nextOffset).toBe(2)
  })

  test('toResponse() infers next link from added item count and remaining ids', () => {
    const req = new HTTPFindRequest(
      /** @type {any} */ ({
        url: 'http://localhost/customers/find?page=1&pageSize=1',
        query: { page: 1, pageSize: 1 },
        payload: { ids: ['a', 'b'] }
      }),
      schemaFor('customers')
    )

    req.add(new HTTPObjectResponse(schemaFor('customers'), 'a', {}))

    expect(req.toResponse()).toEqual({
      data: [{ type: 'customers', id: 'a' }],
      links: {
        self: '/customers/find?page=1&pageSize=1',
        prev: null,
        next: '/customers/find?page=2&pageSize=1'
      }
    })
  })

  test('toResponse() sets next link when there are ids left even if fewer than pageSize items were added', () => {
    const req = new HTTPFindRequest(
      /** @type {any} */ ({
        url: 'http://localhost/customers/find?page=1&pageSize=2',
        query: { page: 1, pageSize: 2 },
        payload: { ids: ['a', 'b', 'c'] }
      }),
      schemaFor('customers')
    )

    req.add(new HTTPObjectResponse(schemaFor('customers'), 'a', {}))

    expect(req.toResponse()).toEqual({
      data: [{ type: 'customers', id: 'a' }],
      links: {
        self: '/customers/find?page=1&pageSize=2',
        prev: null,
        next: '/customers/find?page=2&pageSize=2'
      }
    })
  })

  test('builds prev link for page greater than one', () => {
    const req = new HTTPFindRequest(
      /** @type {any} */ ({
        url: 'http://localhost/customers/find?page=2&pageSize=2',
        query: { page: 2, pageSize: 2 },
        payload: { ids: ['a', 'b', 'c'] }
      }),
      schemaFor('customers')
    )

    expect(req.ids).toEqual(['c'])
    expect(req.toResponse()).toEqual({
      data: [],
      links: {
        self: '/customers/find?page=2&pageSize=2',
        prev: '/customers/find?page=1&pageSize=2',
        next: null
      }
    })
  })
})
