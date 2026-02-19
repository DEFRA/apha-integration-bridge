import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import { buildApplicationFileCompositeRequest } from './application-file-request-builder.js'
import * as fileUploadAndLinkRequestBuilder from './file-upload-and-link-request-builder.js'

/** @import {CreateCasePayload} from '../../types/case-management/case.js' */

const mockCompositeRequest = /** @type {any} */ ({
  allOrNone: true,
  compositeRequest: [
    { referenceId: 'file' },
    { referenceId: 'fileQuery' },
    { referenceId: 'linkFile' }
  ]
})

jest
  .spyOn(
    fileUploadAndLinkRequestBuilder,
    'buildFileUploadAndLinkCompositeRequest'
  )
  .mockReturnValue(mockCompositeRequest)

describe('buildApplicationFileCompositeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should call buildFileUploadAndLinkCompositeRequest with correct parameters and return the result', () => {
    const payload = createPayload()
    const applicationId = 'app-123'
    const expectedBase64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64'
    )
    const result = buildApplicationFileCompositeRequest(payload, applicationId)

    expect(
      fileUploadAndLinkRequestBuilder.buildFileUploadAndLinkCompositeRequest
    ).toHaveBeenCalledWith(
      expectedBase64,
      payload.applicationReferenceNumber,
      `${payload.applicationReferenceNumber}.json`,
      applicationId
    )
    expect(result).toBe(mockCompositeRequest)
  })
})

/**
 * Creates a minimal valid payload for testing
 * @returns {CreateCasePayload}
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
