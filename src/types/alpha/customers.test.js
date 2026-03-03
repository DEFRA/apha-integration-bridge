import { describe, expect, test } from '@jest/globals'

import { HTTPArrayResponse } from '../../lib/http/http-response.js'
import { Customer } from './customers.js'

describe('Customer schema', () => {
  test('is compatible with HTTPArrayResponse', () => {
    expect(() => new HTTPArrayResponse(Customer)).not.toThrow()
  })
})
