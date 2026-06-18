import { describe, test, expect } from '@jest/globals'

import { openApi } from './swagger.js'

describe('openApi swagger plugin config', () => {
  test('enables hapi-swagger documentation routes', () => {
    expect(openApi.options.documentationPage).toBe(true)
    expect(openApi.options.swaggerUI).toBe(true)
  })

  test('keeps OpenAPI JSON route', () => {
    expect(openApi.options.jsonPath).toBe(
      '/.well-known/openapi/v1/openapi.json'
    )
  })
})
