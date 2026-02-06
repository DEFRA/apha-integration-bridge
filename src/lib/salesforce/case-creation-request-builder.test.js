import { describe, expect, test } from '@jest/globals'

import { buildCaseCreationPayload } from './case-creation-request-builder.js'

describe('buildCaseCreationPayload', () => {
  test('should map application and customer identifiers to Salesforce fields', () => {
    const applicationId = 'APP-123'
    const customerId = 'CONTACT-456'

    const result = buildCaseCreationPayload(applicationId, customerId)

    expect(result).toEqual({
      Status: 'Preparing',
      Priority: 'Medium',
      APHA_Application__c: applicationId,
      ContactId: customerId
    })
  })
})
