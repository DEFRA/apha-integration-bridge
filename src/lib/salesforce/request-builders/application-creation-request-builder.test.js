import { describe, test, expect } from '@jest/globals'

import { buildApplicationCreationCompositeRequest } from './application-creation-request-builder.js'

describe('buildApplicationCreationCompositeRequest', () => {
  const apiVersion = 'v62.0'

  test('should return a composite request with allOrNone set to true and five sub-requests', () => {
    const payload = createPayload()

    const result = buildApplicationCreationCompositeRequest(payload)

    expect(result.allOrNone).toBe(true)
    expect(result.compositeRequest).toHaveLength(2)
  })

  test('should include license type query as first sub-request', () => {
    const payload = createPayload()

    const result = buildApplicationCreationCompositeRequest(payload)

    const licenseTypeRequest = result.compositeRequest[0]
    expect(licenseTypeRequest.method).toBe('GET')
    expect(licenseTypeRequest.url).toBe(
      `/services/data/${apiVersion}/query?q=SELECT+Id+FROM+RegulatoryAuthorizationType+WHERE+Name='${payload.keyFacts.licenceType.value}'+LIMIT+1`
    )
    expect(licenseTypeRequest.referenceId).toBe('licenseTypeQuery')
  })

  test('should include application reference update as second sub-request', () => {
    const payload = createPayload()

    const result = buildApplicationCreationCompositeRequest(payload)

    const applicationRequest = result.compositeRequest[1]
    expect(applicationRequest.method).toBe('PATCH')
    expect(applicationRequest.url).toBe(
      `/services/data/${apiVersion}/sobjects/IndividualApplication/APHA_ExternalReferenceNumber__c/${payload.applicationReferenceNumber}`
    )
    expect(applicationRequest.referenceId).toBe('applicationRef')
    expect(applicationRequest.body).toEqual({
      Category: 'License',
      LicenseTypeId: '@{licenseTypeQuery.records[0].Id}'
    })
  })

  test('should use API version from config in all URLs', () => {
    const payload = createPayload()

    const result = buildApplicationCreationCompositeRequest(payload)

    const requestsWithApiVersion = result.compositeRequest.filter((request) =>
      request.url.includes('/services/data/')
    )

    expect(requestsWithApiVersion.length).toBeGreaterThan(0)

    for (const request of requestsWithApiVersion) {
      expect(request.url).toContain(`/services/data/${apiVersion}/`)
    }
  })

  test('should correctly chain references between sub-requests', () => {
    const payload = createPayload()

    const result = buildApplicationCreationCompositeRequest(payload)

    const applicationRequest = result.compositeRequest[1]
    expect(applicationRequest.body.LicenseTypeId).toBe(
      '@{licenseTypeQuery.records[0].Id}'
    )
  })
})

/**
 * Creates a minimal valid payload for testing
 * @returns {import('../../../types/case-management/case.js').CreateCasePayload}
 */
function createPayload() {
  return {
    journeyId: 'TB123',
    journeyVersion: {
      major: 1,
      minor: 0
    },
    applicationReferenceNumber: 'APP-2024-001',
    sections: [
      {
        sectionKey: 'section-1',
        title: 'Section 1',
        questionAnswers: [
          {
            question: 'Test question',
            questionKey: 'test-q',
            answer: {
              type: 'text',
              value: 'Test answer',
              displayText: 'Test answer'
            }
          }
        ]
      }
    ],
    keyFacts: {
      licenceType: {
        type: 'text',
        value: 'TB15'
      },
      requester: {
        type: 'text',
        value: 'origin'
      }
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
