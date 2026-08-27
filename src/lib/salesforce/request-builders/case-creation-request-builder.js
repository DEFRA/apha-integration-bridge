import { CaseStatus } from '../../../types/salesforce/case-status.js'

/** @import {CaseDetailsPayload} from '../../../types/case-management/case.js' */

/**
 * @param {string} applicationId
 * @param {string} customerId
 * @param {string} licenceType - the string representation, eg. "TB15"
 * @returns {CaseDetailsPayload}
 */
export function buildCaseCreationPayload(
  applicationId,
  customerId,
  licenceType
) {
  return {
    Status: CaseStatus.PREPARING,
    Priority: 'Medium',
    APHA_Application__c: applicationId,
    ContactId: customerId
  }
}
