import { describe, expect, test } from '@jest/globals'

import { buildContactRequest } from './contact.js'
import { MappingError } from './shared.js'

describe('contact mapper', () => {
  test('builds contact request with inline address and dual email mapping', () => {
    const contact = {
      contactid: 'CON-1',
      emailaddress1: 'user@example.com',
      emailaddress1_hasvalue: true,
      defra_addrstreet: 'Main Street',
      defra_addrtown: 'Town',
      defra_addrpostcode: 'AA1 1AA',
      defra_addrcountryid: 'GB',
      telephone1: '01234 567890',
      telephone1_hasvalue: true
    }

    const request = buildContactRequest(
      contact,
      { addressDetails: [], addresses: [], accountReference: 'ACC-1' },
      'v62.0'
    )

    expect(request?.url).toContain('/Contact/APHA_DefraCustomerId__c/CON-1')
    expect(request?.body.Email).toBe('user@example.com')
    expect(request?.body.APHA_EmailAddress1__c).toBe('user@example.com')
    expect(request?.body.MailingStreet).toContain('Main Street')
    expect(request?.body.AccountId).toBe('ACC-1')
  })

  test('throws when contact has id but no upsertable fields', () => {
    expect(() =>
      buildContactRequest(
        { contactid: 'CON-2' },
        { addressDetails: [], addresses: [] },
        'v62.0'
      )
    ).toThrow(MappingError)
  })
})
