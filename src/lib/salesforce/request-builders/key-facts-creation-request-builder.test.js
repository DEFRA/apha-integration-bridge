import { describe, test, expect } from '@jest/globals'

import { KeyFactStatus } from '../../../types/salesforce/key-fact-status.js'
import { buildKeyFactsRequest } from './key-facts-creation-request-builder.js'

describe('buildKeyFactsRequest', () => {
  test('should return a key facts request with allOrNone set to true and one record per key fact', () => {
    const payload = createPayload()

    const result = buildKeyFactsRequest(payload)

    expect(result.allOrNone).toBe(true)
    expect(result.records).toHaveLength(3)
  })

  test('should include attributes and identifiers for each key fact record', () => {
    const payload = createPayload()

    const result = buildKeyFactsRequest(payload)

    const licenceTypeRecord = result.records[0]
    expect(licenceTypeRecord.attributes).toEqual({
      type: 'APHA_Key_Fact__c',
      referenceId: 'licenceType'
    })
    expect(licenceTypeRecord.APHA_Key__c).toBe('licenceType')
    expect(licenceTypeRecord.APHA_Application__c).toBe(
      payload.applicationReferenceNumber
    )
  })

  test('should JSON stringify key fact values', () => {
    const payload = createPayload()

    const result = buildKeyFactsRequest(payload)

    const requesterRecord = result.records.find(
      (record) => record.APHA_Key__c === 'requester'
    )
    const originAddressRecord = result.records.find(
      (record) => record.APHA_Key__c === 'originAddress'
    )

    expect(requesterRecord).toBeDefined()
    expect(requesterRecord.APHA_Value__c).toBe(
      JSON.stringify(payload.keyFacts.requester.value)
    )
    expect(requesterRecord.APHA_Entity_Type__c).toBe('text')
    expect(requesterRecord.APHA_Status__c).toBe(KeyFactStatus.UNVALIDATED)

    expect(originAddressRecord).toBeDefined()
    expect(originAddressRecord.APHA_Value__c).toBe(
      JSON.stringify(payload.keyFacts.originAddress.value)
    )
    expect(originAddressRecord.APHA_Entity_Type__c).toBe('address')
    expect(requesterRecord.APHA_Status__c).toBe(KeyFactStatus.UNVALIDATED)
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
