import { afterEach, describe, expect, jest, test } from '@jest/globals'

import {
  applyAddressToBody,
  mapInlineContactAddress,
  mapRegisteredAddress,
  selectAddress
} from './address.js'

describe('address mapper', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  test('selectAddress treats validTo equal to now as active', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)

    const detail = {
      defra_addressid: 'ADDR-1',
      defra_validto: now.toISOString(),
      defra_addresstype: 'Correspondence'
    }

    const address = {
      defra_addressid: 'ADDR-1',
      defra_street: 'High Street',
      defra_towntext: 'Townsville',
      defra_postcode: 'TS1 1TS',
      defra_countryid: 'GB'
    }

    const mapped = selectAddress([detail], [address])

    expect(mapped).toBeDefined()
    expect(mapped?.postalCode).toBe('TS1 1TS')
  })

  test('mapAddressDetail picks up building numbers when present', () => {
    const detail = {
      defra_addressid: 'ADDR-2',
      defra_addresstype: 'Home'
    }

    const address = {
      defra_addressid: 'ADDR-2',
      defra_buildingnumber: '42',
      defra_street: 'Example Road',
      defra_towntext: 'Exampleton',
      defra_postcode: 'EX4 MPL',
      defra_countryid: 'GB'
    }

    const mapped = selectAddress([detail], [address])

    expect(mapped?.street).toContain('42')
    expect(mapped?.city).toBe('Exampleton')
  })

  test('mapInlineContactAddress includes premises when provided', () => {
    const contact = {
      defra_addrpremises: 'Unit 5',
      defra_addrstreet: 'Innovation Way',
      defra_addrtown: 'Techville',
      defra_addrpostcode: 'TE1 2CH',
      defra_addrcountryid: 'GB'
    }

    const inline = mapInlineContactAddress(contact)

    expect(inline?.street).toContain('Unit 5')
    expect(inline?.postalCode).toBe('TE1 2CH')
  })

  test('applyAddressToBody maps fields onto Salesforce bodies', () => {
    const body = {}
    const address = mapRegisteredAddress({
      defra_addregbuildingname: 'Reg Building',
      defra_addregstreet: 'Reg Street',
      defra_addregtown: 'Reg Town',
      defra_addregpostcode: 'RE1 2GG',
      defra_addregcountryid: 'GB'
    })

    applyAddressToBody(
      body,
      address,
      'BillingStreet',
      'BillingCity',
      'BillingState',
      'BillingPostalCode',
      null,
      'BillingCountry'
    )

    expect(body.BillingStreet).toContain('Reg Building')
    expect(body.BillingCity).toBe('Reg Town')
    expect(body.BillingPostalCode).toBe('RE1 2GG')
    expect(body.BillingCountry).toBe('United Kingdom')
  })
})
