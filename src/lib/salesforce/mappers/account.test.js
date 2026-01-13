import { describe, expect, test } from '@jest/globals'

import { buildAccountRequest } from './account.js'
import { MappingError } from './shared.js'

describe('account mapper', () => {
  test('builds account request including registered address', () => {
    const account = {
      accountid: 'ACC-1',
      name: 'Acme Ltd',
      name_hasvalue: true,
      defra_addregbuildingname: 'HQ',
      defra_addregstreet: 'Corporate Way',
      defra_addregtown: 'Metropolis',
      defra_addregpostcode: 'ME1 1ME',
      defra_addregcountryid: 'GB'
    }

    const request = buildAccountRequest(account, 'v62.0')

    expect(request?.url).toContain('/Account/APHA_DefraAccountID__c/ACC-1')
    expect(request?.body.Name).toBe('Acme Ltd')
    expect(request?.body.BillingStreet).toContain('HQ')
    expect(request?.body.BillingCity).toBe('Metropolis')
    expect(request?.body.BillingCountry).toBe('United Kingdom')
  })

  test('throws when account has id but no upsertable fields', () => {
    expect(() => buildAccountRequest({ accountid: 'ACC-2' }, 'v62.0')).toThrow(
      MappingError
    )
  })
})
