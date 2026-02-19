import { KeyFactStatus } from '../../../types/salesforce/key-fact-status.js'

/**
 * @import {CreateCasePayload} from '../../../types/case-management/case.js'
 * @import {KeyFactRequest, KeyFactRecordItem, KeyFactItem} from '../../../types/case-management/case.js'
 */

const keyFactTypeName = 'APHA_Key_Fact__c'

/**
 * @param {CreateCasePayload} payload
 * @returns {KeyFactRequest}
 */
export function buildKeyFactsRequest(payload) {
  const keyFactRecords = Object.entries(payload.keyFacts).map(
    ([keyFactKey, keyFactItem]) =>
      buildSingleKeyFactRequest(
        payload.applicationReferenceNumber,
        keyFactKey,
        keyFactItem
      )
  )
  return {
    allOrNone: true,
    records: keyFactRecords
  }
}

/**
 * @param {string} applicationId
 * @param {string} keyFactKey
 * @param {KeyFactItem} keyFactItem
 * @returns {KeyFactRecordItem}
 */
function buildSingleKeyFactRequest(applicationId, keyFactKey, keyFactItem) {
  const value = keyFactItem.value
  return {
    attributes: {
      type: keyFactTypeName,
      referenceId: keyFactKey
    },
    APHA_Key__c: keyFactKey,
    APHA_Value__c: typeof value === 'string' ? value : JSON.stringify(value),
    APHA_Entity_Type__c: keyFactItem.type,
    APHA_Status__c: KeyFactStatus.UNVALIDATED,
    APHA_Application__c: applicationId
  }
}
