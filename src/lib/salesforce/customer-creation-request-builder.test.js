import { describe, expect, test } from '@jest/globals'

import { buildCustomerCreationPayload } from './customer-creation-request-builder.js'

/** @import {GuestCustomerDetails} from '../../types/case-management/case.js' */

describe('buildCustomerCreationPayload', () => {
  test('should map applicant name and email to Salesforce fields', () => {
    const applicant = /** @type {GuestCustomerDetails} */ ({
      name: {
        firstName: 'Name',
        lastName: 'Surname'
      },
      emailAddress: 'test@mail.com',
      type: 'guest'
    })

    const result = buildCustomerCreationPayload(applicant)

    expect(result).toEqual({
      FirstName: 'Name',
      LastName: 'Surname',
      Email: 'test@mail.com'
    })
  })

  test('should return undefined values when applicant is missing properties', () => {
    const applicant = /** @type {GuestCustomerDetails} */ ({
      name: {
        firstName: undefined,
        lastName: undefined
      },
      emailAddress: undefined
    })

    const result = buildCustomerCreationPayload(applicant)

    expect(result).toEqual({
      FirstName: undefined,
      LastName: undefined,
      Email: undefined
    })
  })

  test('should return undefined values when applicant is undefined', () => {
    const result = buildCustomerCreationPayload(undefined)

    expect(result).toEqual({
      FirstName: undefined,
      LastName: undefined,
      Email: undefined
    })
  })
})
