/** @import {GuestCustomerDetails} from '../../types/case-management/case.js' */

/**
 * @param {GuestCustomerDetails} applicant
 */
export function buildCustomerCreationPayload(applicant) {
  return {
    FirstName: applicant?.name?.firstName,
    LastName: applicant?.name?.lastName,
    Email: applicant?.emailAddress
  }
}
