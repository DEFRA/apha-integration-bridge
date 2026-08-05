import { CaseStatus } from '../../../types/salesforce/case-status.js'

/** @import {CaseDetailsPayload} from '../../../types/case-management/case.js' */

/**
 * @param {string} applicationId
 * @param {string} customerId
 * @param {string} licenseTypeId
 * @returns {CaseDetailsPayload}
 */
export function buildCaseCreationPayload(
  applicationId,
  customerId,
  licenseTypeId
) {
  return {
    Status: CaseStatus.PREPARING,
    Priority: 'Medium',
    APHA_Application__c: applicationId,
    ContactId: customerId,
    APHA_LicenseType__c: licenseTypeId
  }
}
