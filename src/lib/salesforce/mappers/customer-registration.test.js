import { describe, expect, test } from '@jest/globals'
import {
  buildCustomerRegistrationComposite,
  MappingError
} from './customer-registration.js'

describe('customer registration mapper', () => {
  test('builds account and contact composite requests with addressdetails', () => {
    const event = {
      account: {
        accountid: 'ACC-1',
        name: 'Farm Ltd',
        name_hasvalue: true,
        emailaddress1: 'farm@example.com',
        emailaddress1_hasvalue: true,
        defra_addregstreet: '1 High Street',
        defra_addregstreet_hasvalue: true,
        defra_addregtown: 'Winchester',
        defra_addregtown_hasvalue: true,
        defra_addregpostcode: 'SO23 9XX',
        defra_addregpostcode_hasvalue: true
      },
      defra_serviceuser: {
        contactid: 'CON-1',
        defra_title: 1,
        defra_title_hasvalue: true,
        firstname: 'Jane',
        firstname_hasvalue: true,
        lastname: 'Doe',
        lastname_hasvalue: true,
        emailaddress1: 'jane@example.com',
        emailaddress1_hasvalue: true,
        telephone1: '01234 567890',
        telephone1_hasvalue: true
      },
      defra_addressdetails: [
        {
          defra_addressid: 'ADDR-1',
          defra_addresstype: 'Correspondence',
          defra_validfrom: '2024-01-01T00:00:00.000Z'
        }
      ],
      defra_address: [
        {
          defra_addressid: 'ADDR-1',
          defra_street: 'Farm Lane',
          defra_towntext: 'York',
          defra_postcode: 'YO1 1AA',
          defra_countryid: 'GB'
        }
      ]
    }

    const result = buildCustomerRegistrationComposite(event, {
      apiVersion: 'v62.0'
    })

    expect(result.allOrNone).toBe(true)
    expect(result.compositeRequest).toHaveLength(2)

    const account = result.compositeRequest.find(
      (item) => item.referenceId === 'AccountUpsert'
    )
    expect(account).toBeDefined()
    expect(account.body.Name).toBe('Farm Ltd')
    expect(account.body.BillingPostalCode).toBe('SO23 9XX')
    expect(account.body.BillingCity).toBe('Winchester')

    const contact = result.compositeRequest.find(
      (item) => item.referenceId === 'ContactUpsert'
    )
    expect(contact).toBeDefined()
    expect(contact.body.Salutation).toBe('Mr')
    expect(contact.body.Email).toBe('jane@example.com')
    expect(contact.body.MailingCity).toBe('York')
    expect(contact.body.MailingPostalCode).toBe('YO1 1AA')
    expect(contact.body.AccountId).toBe('@{AccountUpsert.id}')
  })

  test('omits fields when hasvalue is false and guards against missing ids', () => {
    expect(() => buildCustomerRegistrationComposite({})).toThrow(MappingError)

    const event = {
      defra_serviceuser: {
        contactid: 'CON-2',
        emailaddress1: 'skip@example.com',
        emailaddress1_hasvalue: false,
        lastname: 'Required',
        lastname_hasvalue: true
      }
    }

    const result = buildCustomerRegistrationComposite(event, {
      apiVersion: 'v62.0'
    })

    expect(result.compositeRequest).toHaveLength(1)
    const [contact] = result.compositeRequest

    expect(contact.body.Email).toBeUndefined()
    expect(contact.body.LastName).toBe('Required')
  })
})
