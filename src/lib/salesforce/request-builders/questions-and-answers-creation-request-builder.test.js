import { describe, test, expect } from '@jest/globals'
import { config } from '../../../config.js'
import { buildQuestionsAndAnswersRequest } from './questions-and-answers-creation-request-builder.js'

const applicationId = 'internal_salesforce_id'
const apiVersion = config.get('salesforce').apiVersion

describe('buildQuestionsAndAnswersRequest', () => {
  test('should return a single graph containing one composite request item per answer', () => {
    const payload = createPayload()

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.graphs).toHaveLength(1)
    expect(result.graphs[0].graphId).toBeTruthy()
    expect(result.graphs[0].compositeRequest).toHaveLength(3)
  })

  test('should include method, url, referenceId and body for each question and answer item', () => {
    const payload = createPayload()

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    const testQuestionItem = result.graphs[0].compositeRequest[0]
    expect(testQuestionItem.method).toBe('POST')
    expect(testQuestionItem.url).toBe(
      `/services/data/${apiVersion}/sobjects/TBL_ApplicationQuestionnaire__c`
    )
    expect(testQuestionItem.referenceId).toBe('section-1_test-q')
    expect(testQuestionItem.body).toEqual({
      TBL_Application__c: applicationId,
      TBL_QuestionKey__c: 'test-q',
      TBL_Question__c: 'Test question',
      TBL_Answer__c: 'Test answer',
      TBL_SectionKey__c: 'section-1'
    })
  })

  test('should map questions and answers from every section in order', () => {
    const payload = createPayload()

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(
      result.graphs[0].compositeRequest.map((item) => item.referenceId)
    ).toEqual(['section-1_test-q', 'section-2_second-q', 'section-2_third-q'])
    expect(
      result.graphs[0].compositeRequest.map((item) => item.body.TBL_Answer__c)
    ).toEqual(['Test answer', 'Second answer', 'Third answer'])
  })

  test('should use the answer display text', () => {
    const payload = createPayload()
    payload.sections[0].questionAnswers[0].answer.value =
      'internal answer value'
    payload.sections[0].questionAnswers[0].answer.displayText =
      'Displayed answer'

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.graphs[0].compositeRequest[0].body.TBL_Answer__c).toBe(
      'Displayed answer'
    )
  })

  test('should return no composite request items when there are no sections', () => {
    const payload = createPayload()
    payload.sections = []

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.graphs[0].compositeRequest).toEqual([])
  })

  test('should return no composite request items for sections without questions and answers', () => {
    const payload = createPayload()
    payload.sections = [
      {
        sectionKey: 'empty-section',
        title: 'Empty section',
        questionAnswers: []
      }
    ]

    const result = buildQuestionsAndAnswersRequest(payload, applicationId)

    expect(result.graphs[0].compositeRequest).toEqual([])
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
