import Hapi from '@hapi/hapi'
import {
  test,
  expect,
  describe,
  jest,
  beforeEach,
  beforeAll,
  afterAll
} from '@jest/globals'
import hapiPino from 'hapi-pino'
import * as route from './case.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'
import { buildApplicationCreationCompositeRequest } from '../../../lib/salesforce/application-creation-request-builder.js'
import { buildSupportingMaterialsCompositeRequest } from '../../../lib/salesforce/supporting-materials-request-builder.js'
import { buildCustomerCreationPayload } from '../../../lib/salesforce/customer-creation-request-builder.js'
import { buildCaseCreationPayload } from '../../../lib/salesforce/case-creation-request-builder.js'

/** @import { CreateCasePayload } from '../../../types/case-management/case.js' */

jest.mock(
  '../../../lib/salesforce/application-creation-request-builder.js',
  () => ({
    buildApplicationCreationCompositeRequest: jest.fn()
  })
)
jest.mock(
  '../../../lib/salesforce/supporting-materials-request-builder.js',
  () => ({
    buildSupportingMaterialsCompositeRequest: jest.fn()
  })
)
jest.mock(
  '../../../lib/salesforce/customer-creation-request-builder.js',
  () => ({
    buildCustomerCreationPayload: jest.fn()
  })
)
jest.mock('../../../lib/salesforce/case-creation-request-builder.js', () => ({
  buildCaseCreationPayload: jest.fn()
}))

const ENDPOINT_PATH = '/case-management/case'
const ENDPOINT_METHOD = 'POST'
const TEST_APP_REF = 'TB-1234-ABCD'

const mockSendComposite = jest.spyOn(salesforceClient, 'sendComposite')
const mockCreateCustomer = jest.spyOn(salesforceClient, 'createCustomer')
const mockCreateCase = jest.spyOn(salesforceClient, 'createCase')
const mockSendQuery = jest.spyOn(salesforceClient, 'sendQuery')
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

const mockSuccessfulCreateCaseResponse = {
  id: 'TEST-CASE-789',
  errors: [],
  success: true
}

const mockApplicantDetaisls = {
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe'
}

beforeEach(() => {
  mockSendComposite.mockReset()
  mockCreateCustomer.mockReset()
  mockCreateCase.mockReset()
  mockSendQuery.mockReset()
  mockSendQuery.mockResolvedValue({ records: [] })
  mockLoggerError.mockReset()
  jest.mocked(buildApplicationCreationCompositeRequest).mockReturnValue({
    allOrNone: true,
    compositeRequest: []
  })
  jest.mocked(buildSupportingMaterialsCompositeRequest).mockResolvedValue({
    allOrNone: true,
    compositeRequest: []
  })
  jest.mocked(buildCustomerCreationPayload).mockReturnValue({
    FirstName: mockApplicantDetaisls.firstName,
    LastName: mockApplicantDetaisls.lastName,
    Email: mockApplicantDetaisls.email
  })
  jest.mocked(buildCaseCreationPayload).mockReturnValue({
    Status: '',
    Priority: '',
    APHA_Application__c: '',
    ContactId: ''
  })
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

/**
 * @param {boolean} includeFiles
 * @returns {CreateCasePayload}
 */
function createValidPayload(includeFiles = false) {
  return /** @type {CreateCasePayload} */ ({
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
              value: mockApplicantDetaisls.email,
              displayText: mockApplicantDetaisls.email
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
      emailAddress: mockApplicantDetaisls.email,
      name: {
        firstName: mockApplicantDetaisls.firstName,
        lastName: mockApplicantDetaisls.lastName
      }
    }
  })
}

describe('POST /case-management/case', () => {
  describe('Successful case creation', () => {
    test('creates case and returns 201 Created', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite.mockResolvedValueOnce(mockSuccessfulCompositeResponse)
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)

      const payload = createValidPayload()
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: mockApplicantDetaisls.email,
          FirstName: mockApplicantDetaisls.firstName,
          LastName: mockApplicantDetaisls.lastName
        }),
        expect.anything()
      )
      expect(mockSendComposite).toHaveBeenCalledTimes(1)
    })

    test('creates case and returns 201 Created when a file is attached', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite.mockResolvedValue(mockSuccessfulCompositeResponse)
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)

      const payload = createValidPayload()
      payload.sections[0].questionAnswers.push({
        question: 'Upload your document',
        questionKey: 'upload',
        answer: {
          type: 'file',
          value: {
            path: 's3/path/file.pdf'
          },
          displayText: 'file.pdf'
        }
      })
      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: mockApplicantDetaisls.email,
          FirstName: mockApplicantDetaisls.firstName,
          LastName: mockApplicantDetaisls.lastName
        }),
        expect.anything()
      )
      expect(buildSupportingMaterialsCompositeRequest).toHaveBeenCalledTimes(1)
      expect(buildSupportingMaterialsCompositeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'section-key',
        'upload',
        's3/path/file.pdf'
      )
      expect(mockSendComposite).toHaveBeenCalledTimes(2)
    })

    test('creates a case, returns 201 Created and uploads multiple files when present in payload', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite.mockResolvedValue(mockSuccessfulCompositeResponse)
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)

      const payload = createValidPayload()
      payload.sections[0].questionAnswers.push({
        question: 'Upload your document',
        questionKey: 'upload-one',
        answer: {
          type: 'file',
          value: {
            path: 's3/path/file-one.pdf'
          },
          displayText: 'file-one.pdf'
        }
      })
      payload.sections[0].questionAnswers.push({
        question: 'Upload your document',
        questionKey: 'upload-two',
        answer: {
          type: 'file',
          value: {
            path: 's3/path/file-two.pdf'
          },
          displayText: 'file-two.pdf'
        }
      })

      const res = await createCase(server, payload)

      expect(res.statusCode).toBe(201)
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: mockApplicantDetaisls.email,
          FirstName: mockApplicantDetaisls.firstName,
          LastName: mockApplicantDetaisls.lastName
        }),
        expect.anything()
      )
      expect(buildSupportingMaterialsCompositeRequest).toHaveBeenCalledTimes(2)
      expect(buildSupportingMaterialsCompositeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'section-key',
        'upload-one',
        's3/path/file-one.pdf'
      )
      expect(buildSupportingMaterialsCompositeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'section-key',
        'upload-two',
        's3/path/file-two.pdf'
      )
      expect(mockSendComposite).toHaveBeenCalledTimes(3)
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

    const errorLogCallArguments = [
      expect.objectContaining({
        err: expect.any(Error),
        endpoint: 'case-management/case'
      }),
      'Failed to create case in Salesforce'
    ]

    beforeAll(() => {
      jest.useFakeTimers()
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    test('returns 500 when createCustomerAccount fails', async () => {
      const server = await createTestServer()

      mockSendComposite.mockResolvedValueOnce(mockSuccessfulCompositeResponse)
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)
      // Mock createCustomer failure - will be retried 4 times (initial + 3 retries)
      mockCreateCustomer
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))

      const payload = createValidPayload()

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockCreateCustomer).toHaveBeenCalledTimes(4)
      expect(mockLoggerError).toHaveBeenCalledWith(...errorLogCallArguments)
    })

    test('returns 500 when createApplication fails', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)
      mockSendComposite
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))

      const payload = createValidPayload()

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockSendComposite).toHaveBeenCalledTimes(4)
      expect(mockLoggerError).toHaveBeenCalledWith(...errorLogCallArguments)
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

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

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
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)
      mockSendComposite.mockResolvedValueOnce(
        /** @type {any} */ (mockInvalidCompositeResponse)
      )

      const payload = createValidPayload()

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockSendComposite).toHaveBeenCalledTimes(1)
    })

    test('returns 500 when createCase fails', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockSendComposite.mockResolvedValueOnce(mockSuccessfulCompositeResponse)
      // Mock createCase failure - will be retried 4 times (initial + 3 retries)
      mockCreateCase
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))

      const payload = createValidPayload()

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockCreateCase).toHaveBeenCalledTimes(4)
      expect(mockLoggerError).toHaveBeenCalledWith(...errorLogCallArguments)
    })

    test('returns 500 when uploading supporting materials fails', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)
      mockSendComposite
        .mockResolvedValueOnce(mockSuccessfulCompositeResponse) // for application creation
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))

      const payload = createValidPayload()
      payload.sections[0].questionAnswers.push({
        question: 'Upload your document',
        questionKey: 'upload',
        answer: {
          type: 'file',
          value: {
            path: 's3/path/file.pdf'
          },
          displayText: 'file.pdf'
        }
      })

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)
      expect(body).toMatchObject(genericError)

      expect(mockSendComposite).toHaveBeenCalledTimes(5) // 1 for case creation + 4 for supporting materials retries
      expect(mockLoggerError).toHaveBeenCalledWith(...errorLogCallArguments)
    })

    test('retries on transient errors before failing', async () => {
      const server = await createTestServer()

      mockCreateCustomer.mockResolvedValueOnce(
        mockSuccessfulCreateCustomerResponse
      )
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)

      // First 2 calls fail, 3rd succeeds
      mockSendComposite
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockSuccessfulCompositeResponse)

      const payload = createValidPayload()

      const responsePromise = createCase(server, payload)
      await jest.runAllTimersAsync()
      const res = await responsePromise

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
      mockCreateCase.mockResolvedValueOnce(mockSuccessfulCreateCaseResponse)
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
