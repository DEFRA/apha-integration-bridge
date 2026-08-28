import { describe, test, expect } from '@jest/globals'

import { KeyFactStatus } from '../../../types/salesforce/key-fact-status.js'
import { buildKeyFactsRequest } from './key-facts-creation-request-builder.js'

const applicationId = 'internal_salesforce_id'

describe('buildKeyFactsRequest', () => {
  test('should return a key facts request with allOrNone set to true and one record per key fact', () => {
    const payload = createPayload()

    const result = buildKeyFactsRequest(payload, applicationId)

    expect(result.allOrNone).toBe(true)
    expect(result.records).toHaveLength(3)
  })

  test('should include attributes and identifiers for each key fact record', () => {
    const payload = createPayload()

    const result = buildKeyFactsRequest(payload, applicationId)

    const licenceTypeRecord = result.records[0]
    expect(licenceTypeRecord.attributes).toEqual({
      type: 'TBL_KeyFact__c',
      referenceId: 'licenceType'
    })
    expect(licenceTypeRecord.TBL_Key__c).toBe('licenceType')
    expect(licenceTypeRecord.TBL_Application__c).toBe(applicationId)
  })

  test('should JSON stringify key fact values', () => {
    const payload = createPayload()

    const result = buildKeyFactsRequest(payload, applicationId)

    const requesterRecord = result.records.find(
      (record) => record.TBL_Key__c === 'requester'
    )
    const originAddressRecord = result.records.find(
      (record) => record.TBL_Key__c === 'originAddress'
    )

    expect(requesterRecord).toBeDefined()
    expect(requesterRecord.TBL_Value__c).toBe(
      JSON.stringify(payload.keyFacts.requester.value)
    )
    expect(requesterRecord.TBL_EntityType__c).toBe('text')
    expect(requesterRecord.TBL_Status__c).toBe(KeyFactStatus.UNVALIDATED)

    expect(originAddressRecord).toBeDefined()
    expect(originAddressRecord.TBL_Value__c).toBe(
      JSON.stringify(payload.keyFacts.originAddress.value)
    )
    expect(originAddressRecord.TBL_EntityType__c).toBe('address')
    expect(requesterRecord.TBL_Status__c).toBe(KeyFactStatus.UNVALIDATED)
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
      },
      originAddress: {
        type: 'address',
        value: {
          addressLine1: 'asdasdasd',
          addressTown: 'asdasdasd',
          addressPostcode: 'RG1 1vv'
        }
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
