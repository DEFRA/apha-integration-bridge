import { describe, expect, test } from '@jest/globals'
import { buildCaseCreationPayload } from './case-creation-request-builder.js'

describe('buildCaseCreationPayload', () => {
  test('should map application, customer and licence type to Salesforce fields', () => {
    const applicationId = 'APP-123'
    const customerId = 'CONTACT-456'
    const licenceType = 'TB15'

    const result = buildCaseCreationPayload(
      applicationId,
      customerId,
      licenceType
    )

    expect(result).toEqual({
      Priority: 'Medium',
      APHA_Application__c: applicationId,
      ContactId: customerId
    })
  })
})
