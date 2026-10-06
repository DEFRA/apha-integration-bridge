import { config } from '../../../config.js'

/**
 * @import {CreateCasePayload} from '../../../types/case-management/case.js'
 * @import {QuestionAndAnswerGraphRequest} from '../../../types/case-management/case.js'
 * @import {CompositeRequestItem} from '../../../types/salesforce/composite-request.js'
 */

const salesforceConfig = config.get('salesforce')
const questionAndAnswerTypeName = 'TBL_ApplicationQuestionnaire__c'
const questionAndAnswerGraphId = 'QuestionsAndAnswers'

/**
 * @param {CreateCasePayload} payload
 * @param {string} applicationId
 * @returns {QuestionAndAnswerGraphRequest}
 */
export function buildQuestionsAndAnswersRequest(payload, applicationId) {
  const compositeRequest = payload.sections.flatMap((section) => {
    return section.questionAnswers.map((question) => {
      return buildSingleQuestionAndAnswerRequest(
        applicationId,
        question.questionKey,
        question.question,
        section.sectionKey,
        question.answer.displayText
      )
    })
  })
  return {
    graphs: [
      {
        graphId: questionAndAnswerGraphId,
        compositeRequest
      }
    ]
  }
}

/**
 * @param {string} applicationId
 * @param {string} questionKey
 * @param {string} question
 * @param {string} sectionKey
 * @param {string} answer
 * @returns {CompositeRequestItem}
 */
function buildSingleQuestionAndAnswerRequest(
  applicationId,
  questionKey,
  question,
  sectionKey,
  answer
) {
  return {
    method: 'POST',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/${questionAndAnswerTypeName}`,
    referenceId: buildReferenceId(sectionKey, questionKey),
    body: {
      TBL_Application__c: applicationId,
      TBL_Question__c: question,
      TBL_QuestionKey__c: questionKey,
      TBL_SectionKey__c: sectionKey,
      TBL_Answer__c: answer
    }
  }
}

/**
 * @param {string} sectionKey
 * @param {string} questionKey
 * @returns {string}
 */
function buildReferenceId(sectionKey, questionKey) {
  return `${sectionKey}_${questionKey}`.replace(/[^a-zA-Z0-9_]/g, '_')
}
