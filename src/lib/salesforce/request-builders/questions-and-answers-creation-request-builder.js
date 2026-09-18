/**
 * @import {CreateCasePayload} from '../../../types/case-management/case.js'
 * @import {QuestionAndAnswerRequest, QuestionAndAnswerRecordItem} from '../../../types/case-management/case.js'
 */

const questionAndAnswerTypeName = 'TBL_ApplicationQuestionnaire__c'

/**
 * @param {CreateCasePayload} payload
 * @param {string} applicationId
 * @returns {QuestionAndAnswerRequest}
 */
export function buildQuestionsAndAnswersRequest(payload, applicationId) {
  const questionAndAnswerRecords = payload.sections.flatMap((section) => {
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
    allOrNone: true,
    records: questionAndAnswerRecords
  }
}

/**
 * @param {string} applicationId
 * @param {string} questionKey
 * @param {string} question
 * @param {string} sectionKey
 * @param {string} answer
 * @returns {QuestionAndAnswerRecordItem}
 */
function buildSingleQuestionAndAnswerRequest(
  applicationId,
  questionKey,
  question,
  sectionKey,
  answer
) {
  return {
    attributes: {
      type: questionAndAnswerTypeName
    },
    TBL_QuestionKey__c: questionKey,
    TBL_Question__c: question,
    TBL_SectionKey__c: sectionKey,
    TBL_Answer__c: answer,
    TBL_Application__c: applicationId
  }
}
