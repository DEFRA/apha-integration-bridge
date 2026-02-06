/** @import {CaseDetails} from '../../types/case-management/case.js' */

/**
 * @param {string} applicationId
 * @param {string} customerId
 * @returns {CaseDetails}
 */
export function buildCaseCreationPayload(applicationId, customerId) {
  return {
    Status: 'Preparing',
    Priority: 'Medium',
    APHA_Application__c: applicationId,
    ContactId: customerId
  }
}
