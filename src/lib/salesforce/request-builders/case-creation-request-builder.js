/** @import {CaseDetailsPayload} from '../../../types/case-management/case.js' */

/**
 * @param {string} applicationId
 * @returns {CaseDetailsPayload}
 */
export function buildCaseCreationPayload(applicationId) {
  return {
    Priority: 'Medium',
    APHA_Application__c: applicationId
  }
}
