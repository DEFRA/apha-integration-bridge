import { KeyFactStatus } from '../../../types/salesforce/key-fact-status.js'

/**
 * @import {CreateCasePayload} from '../../../types/case-management/case.js'
 * @import {KeyFactRequest, KeyFactRecordItem, KeyFactItem} from '../../../types/case-management/case.js'
 */

const keyFactTypeName = 'TBL_KeyFact__c'

/**
 * @param {CreateCasePayload} payload
 * @param {string} applicationId
 * @returns {KeyFactRequest}
 */
export function buildKeyFactsRequest(payload, applicationId) {
  const keyFactRecords = Object.entries(payload.keyFacts).map(
    ([keyFactKey, keyFactItem]) =>
      buildSingleKeyFactRequest(applicationId, keyFactKey, keyFactItem)
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
  return {
    attributes: {
      type: keyFactTypeName,
      referenceId: keyFactKey
    },
    TBL_Key__c: keyFactKey,
    TBL_Value__c: JSON.stringify(keyFactItem.value),
    TBL_EntityType__c: keyFactItem.type,
    TBL_Status__c: KeyFactStatus.UNVALIDATED,
    TBL_Application__c: applicationId
  }
}
