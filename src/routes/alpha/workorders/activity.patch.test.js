import Hapi from '@hapi/hapi'
import { test, expect, describe, beforeAll } from '@jest/globals'

import * as route from './activity.patch.js'
import { scenarios } from './activity.mocks.js'
import { errorEnvelope } from '../../../common/helpers/error-envelope.js'
import { versionPlugin } from '../../../common/helpers/versioning.js'

const path = '/alpha/workorders/activity'

// Resolved-Not-Required keeps this a minimal valid payload: the three
// conditional fields are only mandatory when the closing reason is
// Resolved-Completed (see the conditional-field tests below).
const validPayload = {
  workscheduleid: 'WS-12345',
  workscheduleactivityid: 'WSA-100023',
  activityclosingreason: 'Resolved-Not-Required',
  businessresource: 'forename.surname@apha.gov.uk'
}

const completedConditionalFields = {
  resourcecompletingactivity: 'forename.surname@apha.gov.uk',
  activityactualstartdate: '2025-09-20T15:45:00Z',
  activitycompletiondate: '2025-09-21T15:45:00Z'
}

describe('Workorders activity', () => {
  // Mirror the production error behaviour: server.js sets
  // abortEarly: false and registers errorEnvelope and versionPlugin.
  const server = Hapi.server({
    routes: { validate: { options: { abortEarly: false } } }
  })

  beforeAll(async () => {
    await server.register([errorEnvelope, versionPlugin])

    server.route({
      ...route,
      path,
      method: 'PATCH'
    })
  })

  test('returns the success response for the success scenario', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: validPayload,
      headers: { 'x-test-scenario': 'success' }
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual(scenarios.success.response)
  })

  test('defaults to the success scenario when the header is absent', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: validPayload
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual(scenarios.success.response)
  })

  test('accepts the optional fields', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: {
        ...validPayload,
        activityscheduleddate: '2025-09-18T12:00:00Z',
        resourcecompletingactivity: 'forename.surname@apha.gov.uk',
        activityactualstartdate: '2025-09-20T15:45:00Z',
        activitycompletiondate: '2025-09-21T15:45:00Z'
      }
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual(scenarios.success.response)
  })

  test('does not validate field formats, only presence', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: {
        workscheduleid: 'not-a-work-schedule-id',
        workscheduleactivityid: 'not-an-activity-id',
        activityclosingreason: 'not-a-closing-reason',
        businessresource: 'not-an-email',
        activityscheduleddate: 'not-a-date',
        resourcecompletingactivity: 'not-an-email-either',
        activityactualstartdate: 'not-a-start-date',
        activitycompletiondate: 'not-a-completion-date'
      }
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual(scenarios.success.response)
  })

  test('accepts Resolved-Completed when the conditional fields are present', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: {
        ...validPayload,
        activityclosingreason: 'Resolved-Completed',
        ...completedConditionalFields
      }
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual(scenarios.success.response)
  })

  test('keeps the conditional fields optional for Resolved-Not-Required', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: {
        ...validPayload,
        activityclosingreason: 'Resolved-Not-Required'
      }
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual(scenarios.success.response)
  })

  test.each([
    'resourcecompletingactivity',
    'activityactualstartdate',
    'activitycompletiondate'
  ])(
    'returns BAD_REQUEST if %s is missing when closing reason is Resolved-Completed',
    async (field) => {
      const payload = {
        ...validPayload,
        activityclosingreason: 'Resolved-Completed',
        ...completedConditionalFields
      }

      delete payload[field]

      const res = await server.inject({ method: 'PATCH', url: path, payload })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload)).toEqual({
        message: 'Invalid request parameters',
        code: 'BAD_REQUEST',
        errors: [
          { code: 'VALIDATION_ERROR', message: `"${field}" is required` }
        ]
      })
    }
  )

  test('aggregates every missing conditional field for Resolved-Completed', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: { ...validPayload, activityclosingreason: 'Resolved-Completed' }
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request parameters',
      code: 'BAD_REQUEST',
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message:
            '"resourcecompletingactivity" is required. "activityactualstartdate" is required. "activitycompletiondate" is required'
        }
      ]
    })
  })

  test('exposes exactly the documented scenarios', () => {
    expect(Object.keys(scenarios).sort()).toEqual(
      [
        'success',
        'sam-api-error-validation',
        'sam-api-error-ws-not-found',
        'sam-api-error-ws-activity-not-found',
        'sam-api-error-ws-wsa-invalid-combination',
        'sam-api-error-resource-invalid',
        'sam-api-error-unexpected-error',
        'sam-api-error-ws-closed',
        'sam-api-error-invalid-class-type',
        'sam-api-error-wsa-locked'
      ].sort()
    )
  })

  test.each(Object.entries(scenarios).filter(([name]) => name !== 'success'))(
    'returns the canned error for the %s scenario',
    async (name, scenario) => {
      const res = await server.inject({
        method: 'PATCH',
        url: path,
        payload: validPayload,
        headers: { 'x-test-scenario': name }
      })

      expect(res.statusCode).toBe(scenario.statusCode)
      expect(JSON.parse(res.payload)).toEqual(scenario.response)
    }
  )

  test.each([
    'workscheduleid',
    'workscheduleactivityid',
    'activityclosingreason',
    'businessresource'
  ])('returns BAD_REQUEST if %s is missing', async (field) => {
    const payload = { ...validPayload }

    delete payload[field]

    const res = await server.inject({ method: 'PATCH', url: path, payload })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request parameters',
      code: 'BAD_REQUEST',
      errors: [{ code: 'VALIDATION_ERROR', message: `"${field}" is required` }]
    })
  })

  test('aggregates every missing mandatory field into one error', async () => {
    const res = await server.inject({ method: 'PATCH', url: path, payload: {} })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request parameters',
      code: 'BAD_REQUEST',
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message:
            '"workscheduleid" is required. "workscheduleactivityid" is required. "activityclosingreason" is required. "businessresource" is required'
        }
      ]
    })
  })

  test('returns BAD_REQUEST if the body is absent', async () => {
    const res = await server.inject({ method: 'PATCH', url: path })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request parameters',
      code: 'BAD_REQUEST',
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message: '"Standard Work Update" must be of type object'
        }
      ]
    })
  })

  test('returns BAD_REQUEST for an unknown payload property', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: { ...validPayload, foo: 'bar' }
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request parameters',
      code: 'BAD_REQUEST',
      errors: [{ code: 'VALIDATION_ERROR', message: '"foo" is not allowed' }]
    })
  })

  test('returns BAD_REQUEST for an unknown x-test-scenario value', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: validPayload,
      headers: { 'x-test-scenario': 'nonsense' }
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request parameters',
      code: 'BAD_REQUEST',
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('"x-test-scenario" must be one of')
        }
      ]
    })
  })

  test('returns the bridge envelope for a malformed JSON body', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: '{ not json',
      headers: { 'content-type': 'application/json' }
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Invalid request payload JSON format',
      code: 'BAD_REQUEST',
      errors: []
    })
  })

  test('returns UNSUPPORTED_VERSION for an unknown API version', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: path,
      payload: validPayload,
      headers: { accept: 'application/vnd.apha.2+json' }
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload)).toEqual({
      message: 'Unknown version: 2',
      code: 'UNSUPPORTED_VERSION',
      errors: []
    })
  })

  test('reads the endpoint documentation into the swagger notes', () => {
    expect(route.options.notes).toContain('## Request payload')
    expect(route.options.notes).toContain(
      '## Choosing a response with `x-test-scenario`'
    )
    expect(route.options.notes).toContain('## Error responses')
  })
})
