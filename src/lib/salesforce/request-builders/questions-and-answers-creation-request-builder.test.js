import { describe, test, expect } from '@jest/globals'
import { buildQuestionsAndAnswersRequest } from './questions-and-answers-creation-request-builder.js'

const applicationId = 'internal_salesforce_id'

describe('buildQuestionsAndAnswersRequest', () => {
  test('should return a questions and answers request with allOrNone set to true and one record per answer', () => {
    const payload = createPayload()

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.allOrNone).toBe(true)
    expect(result.records).toHaveLength(3)
  })

  test('should include attributes and identifiers for each question and answer record', () => {
    const payload = createPayload()

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    const testQuestionRecord = result.records[0]
    expect(testQuestionRecord.attributes).toEqual({
      type: 'TBL_ApplicationQuestionnaire__c'
    })
    expect(testQuestionRecord.TBL_Application__c).toBe(applicationId)
    expect(testQuestionRecord.TBL_QuestionKey__c).toBe('test-q')
    expect(testQuestionRecord.TBL_Question__c).toBe('Test question')
    expect(testQuestionRecord.TBL_Answer__c).toBe('Test answer')
    expect(testQuestionRecord.TBL_SectionKey__c).toBe('section-1')
  })

  test('should map questions and answers from every section in order', () => {
    const payload = createPayload()

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.records.map((record) => record.TBL_QuestionKey__c)).toEqual([
      'test-q',
      'second-q',
      'third-q'
    ])
    expect(result.records.map((record) => record.TBL_SectionKey__c)).toEqual([
      'section-1',
      'section-2',
      'section-2'
    ])
    expect(result.records.map((record) => record.TBL_Answer__c)).toEqual([
      'Test answer',
      'Second answer',
      'Third answer'
    ])
  })

  test('should use the answer display text', () => {
    const payload = createPayload()
    payload.sections[0].questionAnswers[0].answer.value =
      'internal answer value'
    payload.sections[0].questionAnswers[0].answer.displayText =
      'Displayed answer'

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.records[0].TBL_Answer__c).toBe('Displayed answer')
  })

  test('should return no records when there are no sections', () => {
    const payload = createPayload()
    payload.sections = []

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.records).toEqual([])
  })

  test('should return no records for sections without questions and answers', () => {
    const payload = createPayload()
    payload.sections = [
      {
        sectionKey: 'empty-section',
        title: 'Empty section',
        questionAnswers: []
      }
    ]

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.records).toEqual([])
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
      },
      {
        sectionKey: 'section-2',
        title: 'Section 2',
        questionAnswers: [
          {
            question: 'Second question',
            questionKey: 'second-q',
            answer: {
              type: 'text',
              value: 'Second answer',
              displayText: 'Second answer'
            }
          },
          {
            question: 'Third question',
            questionKey: 'third-q',
            answer: {
              type: 'text',
              value: 'Third answer',
              displayText: 'Third answer'
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
