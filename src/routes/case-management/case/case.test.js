import Hapi from '@hapi/hapi'
import { test, expect, describe, jest, beforeEach } from '@jest/globals'
import hapiPino from 'hapi-pino'
import * as route from './case.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'

const ENDPOINT_PATH = '/case-management/case'
const ENDPOINT_METHOD = 'POST'
const TEST_APP_REF = 'TB-1234-ABCD'

const mockSendComposite = jest.spyOn(salesforceClient, 'sendComposite')
const mockCreateCustomer = jest.spyOn(salesforceClient, 'createCustomer')
const mockLoggerError = jest.fn()

const mockSuccessfulCreateCustomerResponse = {
  id: 'TEST-CUSTOMER-123',
  errors: [],
  success: true
}

const mockSuccessfulCompositeResponse = {
  compositeResponse: [
    {
      body: {
        id: 'TEST-CASE-789',
        success: true,
        errors: []
      },
      httpHeaders: {
        Location: '/test/case/TEST-CASE-789'
      },
      httpStatusCode: 201,
      referenceId: 'createCase'
    }
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
})

async function createTestServer() {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    }
  ])

  server.ext('onPreHandler', (request, h) => {
    request.logger = /** @type {any} */ ({
      error: mockLoggerError,
      info: jest.fn()
    })
    return h.continue
  })

  server.route({
    handler: route.default.handler,
    options: route.default.options,
    path: ENDPOINT_PATH,
    method: ENDPOINT_METHOD
  })

  return server
}

/**
 * @param {Hapi.Server} server
 * @param {Record<string, any>} payload
 * @param {Record<string, string>} [headers]
 */
async function createCase(server, payload, headers = {}) {
  return server.inject({
    method: ENDPOINT_METHOD,
    url: ENDPOINT_PATH,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    payload
  })
}

function createValidPayload() {
  return {
    journeyId: 'JOURNEY_ID',
    journeyVersion: { major: 1, minor: 0 },
    applicationReferenceNumber: TEST_APP_REF,
    sections: [
      {
        sectionKey: 'section-key',
        title: 'Section Title',
        questionAnswers: [
          {
            question: 'What is your email address?',
            questionKey: 'email',
            answer: {
              type: 'text',
              value: 'test@example.com',
              displayText: 'test@example.com'
            }
          }
        ]
      }
    ],
    keyFacts: {
      licenceType: 'TB15',
      requester: 'origin'
    },
    applicant: {
      type: 'guest',
      emailAddress: 'test@example.com',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  }
}

describe('POST /case-management/case', () => {
  describe('Successful case creation', () => {
    test('creates case and returns 201 Created', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite.mockResolvedValueOnce(mockSuccessfulCompositeResponse)

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: 'test@example.com',
          FirstName: 'John',
          LastName: 'Doe'
        }),
        expect.anything()
      )
      expect(mockSendComposite).toHaveBeenCalledTimes(1)
      expect(mockSendComposite).toHaveBeenCalledWith(
        expect.objectContaining({
          allOrNone: true,
          compositeRequest: expect.any(Array)
        }),
        expect.anything()
      )
    })
  })

  describe('Payload validation', () => {
    test('returns 400 for missing applicationReferenceNumber', async () => {
      const server = await createTestServer()

      const payload = createValidPayload()
      delete payload.applicationReferenceNumber

      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        message: 'Invalid request parameters',
        code: 'BAD_REQUEST'
      })
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)
      expect(body.errors[0]).toHaveProperty('code', 'VALIDATION_ERROR')

      expect(mockSendComposite).not.toHaveBeenCalled()
    })

    test('returns 400 for missing journeyId', async () => {
      const server = await createTestServer()

      const payload = createValidPayload()
      delete payload.journeyId

      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(mockSendComposite).not.toHaveBeenCalled()
    })

    test('returns 400 for invalid sections structure', async () => {
      const server = await createTestServer()

      const payload = createValidPayload()
      payload.sections = [
        /** @type {any} */ ({
          sectionKey: 'invalid-section'
        })
      ]

      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(mockSendComposite).not.toHaveBeenCalled()
    })

    test('returns 400 for invalid keyFacts structure', async () => {
      const server = await createTestServer()

      const payload = createValidPayload()
      delete payload.keyFacts.licenceType

      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(mockSendComposite).not.toHaveBeenCalled()
    })

    test('returns 400 for invalid applicant email', async () => {
      const server = await createTestServer()

      const payload = createValidPayload()
      payload.applicant.emailAddress = 'invalid-email'

      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(mockSendComposite).not.toHaveBeenCalled()
    })

    test('returns 400 for empty payload', async () => {
      const server = await createTestServer()

      const res = await createCase(server, {})

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)
      expect(mockSendComposite).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    const genericError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Your request could not be processed',
      errors: [
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create case on the case management service'
        }
      ]
    }

    test('returns 500 when createCustomerAccount fails', async () => {
      const server = await createTestServer()

      mockSendComposite.mockResolvedValueOnce(mockSuccessfulCompositeResponse)
      // Mock createCustomer failure - will be retried 4 times (initial + 3 retries)
      mockCreateCustomer
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockCreateCustomer).toHaveBeenCalledTimes(4)
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          endpoint: 'case-management/case'
        }),
        'Failed to create case in Salesforce'
      )
    })

    test('returns 500 when createApplication fails', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockSendComposite).toHaveBeenCalledTimes(4)
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          endpoint: 'case-management/case'
        }),
        'Failed to create case in Salesforce'
      )
    })

    test('returns 500 when composite operations within createApplication partially fail', async () => {
      const server = await createTestServer()

      const mockFailedCompositeResponse = {
        compositeResponse: [
          {
            body: {
              id: 'TEST-CASE-123',
              success: true,
              errors: []
            },
            httpHeaders: {
              Location: '/test/case/TEST-CASE-123'
            },
            httpStatusCode: 201,
            referenceId: 'createCase'
          },
          {
            body: [
              {
                errorCode: 'REQUIRED_FIELD_MISSING',
                message: 'Required field missing'
              }
            ],
            httpHeaders: {},
            httpStatusCode: 400,
            referenceId: 'updateContact'
          }
        ]
      }

      mockSendComposite.mockResolvedValueOnce(mockFailedCompositeResponse)
      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockSendComposite).toHaveBeenCalledTimes(1)

      // Verify logger was called with correct details for composite operation error
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'case-management/case',
          failedOperations: [
            {
              referenceId: 'updateContact',
              httpStatusCode: 400,
              errors: [
                {
                  errorCode: 'REQUIRED_FIELD_MISSING',
                  message: 'Required field missing'
                }
              ]
            }
          ]
        }),
        'Composite operations failed in Salesforce'
      )
    })

    test('returns 500 when composite response within createApplication is not an array', async () => {
      const server = await createTestServer()
      const mockInvalidCompositeResponse = {
        compositeResponse: {
          prop: 'value'
        }
      }

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite.mockResolvedValueOnce(
        /** @type {any} */ (mockInvalidCompositeResponse)
      )
      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockSendComposite).toHaveBeenCalledTimes(1)
    })

    test('retries on transient errors before failing', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      // First 2 calls fail, 3rd succeeds
      mockSendComposite
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockSuccessfulCompositeResponse)

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)

      // Should have been called 3 times (initial + 2 retries)
      expect(mockSendComposite).toHaveBeenCalledTimes(3)
    })
  })

  describe('Composite response handling', () => {
    beforeEach(() => {
      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
    })

    test('handles multiple composite operations successfully', async () => {
      const server = await createTestServer()

      const mockCompositeResponse = {
        compositeResponse: [
          {
            body: {
              totalSize: 1,
              done: true,
              records: [
                {
                  attributes: {
                    type: 'RegulatoryAuthorizationType',
                    url: '/test/license-type/TEST-LICENSE-123'
                  },
                  Id: 'TEST-LICENSE-123'
                }
              ]
            },
            httpHeaders: {},
            httpStatusCode: 200,
            referenceId: 'licenseTypeQuery'
          },
          {
            body: {
              id: 'TEST-CASE-456',
              success: true,
              errors: [],
              created: false
            },
            httpHeaders: {
              Location: '/test/case/TEST-CASE-456'
            },
            httpStatusCode: 200,
            referenceId: 'createCase'
          },
          {
            body: {
              id: 'TEST-CONTENT-789',
              success: true,
              errors: []
            },
            httpHeaders: {
              Location: '/test/content/TEST-CONTENT-789'
            },
            httpStatusCode: 201,
            referenceId: 'createContentVersion'
          }
        ]
      }

      mockSendComposite.mockResolvedValueOnce(mockCompositeResponse)

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)
    })

    test('handles composite response with 200 status codes', async () => {
      const server = await createTestServer()

      const mockCompositeResponse = {
        compositeResponse: [
          {
            body: {
              attributes: {
                type: 'ContentVersion',
                url: '/test/content/TEST-CONTENT-999'
              },
              ContentDocumentId: 'TEST-DOC-999',
              Id: 'TEST-CONTENT-999'
            },
            httpHeaders: {},
            httpStatusCode: 200,
            referenceId: 'contentVersionQuery'
          }
        ]
      }

      mockSendComposite.mockResolvedValueOnce(mockCompositeResponse)

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)
    })

    test('handles mixed success and error codes correctly', async () => {
      const server = await createTestServer()

      const mockMixedResponse = {
        compositeResponse: [
          {
            body: {
              id: 'TEST-CASE-123',
              success: true,
              errors: []
            },
            httpHeaders: {
              Location: '/test/case/TEST-CASE-123'
            },
            httpStatusCode: 201,
            referenceId: 'createCase'
          },
          {
            body: [{ errorCode: 'INVALID_FIELD', message: 'Invalid field' }],
            httpHeaders: {},
            httpStatusCode: 404,
            referenceId: 'linkRecord'
          }
        ]
      }

      mockSendComposite.mockResolvedValueOnce(mockMixedResponse)

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })
})
