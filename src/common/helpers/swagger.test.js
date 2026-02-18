import { describe, test, expect } from '@jest/globals'

import { openApi } from './swagger.js'

describe('openApi swagger plugin config', () => {
  test('disables hapi-swagger documentation routes', () => {
    expect(openApi.options.documentationPage).toBe(false)
    expect(openApi.options.swaggerUI).toBe(false)
  })

  test('keeps OpenAPI JSON route', () => {
    expect(openApi.options.jsonPath).toBe(
      '/.well-known/openapi/v1/openapi.json'
    )
  })
})
