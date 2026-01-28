import { describe, test, expect, beforeEach } from '@jest/globals'

import { buildCaseCreationCompositeRequest } from './composite-request-builder.js'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'

describe('buildCaseCreationCompositeRequest', () => {
  const apiVersion = 'v62.0'
  const salesforceConfig = {
    baseUrl: 'https://salesforce.test',
    authUrl: undefined,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    apiVersion,
    requestTimeoutMs: 1000
  }

  beforeEach(() => {
    spyOnConfig('salesforce', salesforceConfig)
  })

  test('should return a composite request with allOrNone set to true and five sub-requests', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    expect(result.allOrNone).toBe(true)
    expect(result.compositeRequest).toHaveLength(5)
  })

  test('should include license type query as first sub-request', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    const licenseTypeRequest = result.compositeRequest[0]
    expect(licenseTypeRequest.method).toBe('GET')
    expect(licenseTypeRequest.url).toBe(
      `/services/data/${apiVersion}/query?q=SELECT+Id+FROM+RegulatoryAuthorizationType+WHERE+Name='${payload.keyFacts.licenceType}'+LIMIT+1`
    )
    expect(licenseTypeRequest.referenceId).toBe('licenseTypeQuery')
  })

  test('should include application reference update as second sub-request', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

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

  test('should include file upload as third sub-request with base64 encoded payload', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    const fileRequest = result.compositeRequest[2]
    expect(fileRequest.method).toBe('POST')
    expect(fileRequest.url).toBe(
      `/services/data/${apiVersion}/sobjects/ContentVersion`
    )
    expect(fileRequest.referenceId).toBe('file')

    const expectedBase64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64'
    )
    expect(fileRequest.body).toEqual({
      Title: `${payload.applicationReferenceNumber}-v2.0`,
      PathOnClient: `${payload.applicationReferenceNumber}-v2.0.json`,
      VersionData: expectedBase64
    })
  })

  test('should include file ID query as fourth sub-request', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    const fileQueryRequest = result.compositeRequest[3]
    expect(fileQueryRequest.method).toBe('GET')
    expect(fileQueryRequest.url).toBe(
      `/services/data/${apiVersion}/sobjects/ContentVersion/@{file.id}?fields=ContentDocumentId`
    )
    expect(fileQueryRequest.referenceId).toBe('fileQuery')
  })

  test('should include file link creation as fifth sub-request', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    const linkRequest = result.compositeRequest[4]
    expect(linkRequest.method).toBe('POST')
    expect(linkRequest.url).toBe(
      `/services/data/${apiVersion}/sobjects/ContentDocumentLink`
    )
    expect(linkRequest.referenceId).toBe('linkFile')
    expect(linkRequest.body).toEqual({
      LinkedEntityId: '@{applicationRef.id}',
      ContentDocumentId: '@{fileQuery.ContentDocumentId}',
      ShareType: 'V',
      Visibility: 'AllUsers'
    })
  })

  test('should use API version from config in all URLs', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    const requestsWithApiVersion = result.compositeRequest.filter((request) =>
      request.url.includes('/services/data/')
    )

    expect(requestsWithApiVersion.length).toBeGreaterThan(0)

    for (const request of requestsWithApiVersion) {
      expect(request.url).toContain(`/services/data/${apiVersion}/`)
    }
  })

  test('should preserve key facts and all sections and question answers in encoded payload', () => {
    const payload = createPayload()

    payload.sections = [
      {
        sectionKey: 'section-1',
        title: 'Section 1',
        questionAnswers: [
          {
            question: 'Question 1',
            questionKey: 'q1',
            answer: {
              type: 'text',
              value: 'Answer 1',
              displayText: 'Answer 1'
            }
          }
        ]
      },
      {
        sectionKey: 'section-2',
        title: 'Section 2',
        questionAnswers: [
          {
            question: 'Question 2',
            questionKey: 'q2',
            answer: {
              type: 'number',
              value: 42,
              displayText: '42'
            }
          }
        ]
      }
    ]

    const result = buildCaseCreationCompositeRequest(payload)

    const fileRequest = result.compositeRequest[2]
    const encodedPayload = JSON.parse(
      Buffer.from(fileRequest.body.VersionData, 'base64').toString('utf8')
    )

    expect(encodedPayload.keyFacts.licenceType).toBe('TB Movement License')
    expect(encodedPayload.keyFacts.requester).toBe('origin')
    expect(encodedPayload.sections).toHaveLength(2)
    expect(encodedPayload.sections[0].questionAnswers).toHaveLength(1)
    expect(encodedPayload.sections[1].questionAnswers).toHaveLength(1)
  })

  test('should correctly chain references between sub-requests', () => {
    const payload = createPayload()

    const result = buildCaseCreationCompositeRequest(payload)

    const applicationRequest = result.compositeRequest[1]
    expect(applicationRequest.body.LicenseTypeId).toBe(
      '@{licenseTypeQuery.records[0].Id}'
    )

    const fileQueryRequest = result.compositeRequest[3]
    expect(fileQueryRequest.url).toContain('@{file.id}')

    const linkRequest = result.compositeRequest[4]
    expect(linkRequest.body.LinkedEntityId).toBe('@{applicationRef.id}')
    expect(linkRequest.body.ContentDocumentId).toBe(
      '@{fileQuery.ContentDocumentId}'
    )
  })
})

/**
 * Creates a minimal valid payload for testing
 * @returns {import('../../types/case-management/case.js').CreateCasePayload}
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
      licenceType: 'TB Movement License',
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
