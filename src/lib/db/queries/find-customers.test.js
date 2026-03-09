import { describe, expect, jest, test } from '@jest/globals'

import * as dbOperations from '../operations/execute.js'
import { findCustomers, findCustomersQuery } from './find-customers.js'

test('returns the expected query for valid ids', () => {
  const ids = ['C123456', 'C234567']

  const { sql } = findCustomersQuery(ids, 'PERSON')

  expect(sql).toMatchSnapshot()
})

test('throws if the parameters are invalid', () => {
  expect(() => findCustomersQuery([], 'PERSON')).toThrow(/invalid/i)
})

test('throws when ids contain invalid characters', () => {
  expect(() => findCustomersQuery(["C123456' OR '1'='1"], 'PERSON')).toThrow(
    /invalid/i
  )
})

test('throws if customerType is missing', () => {
  expect(() =>
    // @ts-expect-error - explicitly testing missing required parameter
    findCustomersQuery(['C123456'])
  ).toThrow(/customertype/i)
})

describe('findCustomers', () => {
  const executeSpy = jest.spyOn(dbOperations, 'execute')

  test('returns mapped customers in requested order', async () => {
    executeSpy.mockResolvedValue([
      {
        party_id: 'C123456',
        customer_type: 'PERSON',
        title: 'Mr',
        first_name: 'Bert',
        second_name: null,
        last_name: 'Farmer',
        organisation_name: null,
        primary_contact_full_name: null,
        paon_start_number: 12,
        paon_start_number_suffix: null,
        paon_end_number: null,
        paon_end_number_suffix: null,
        paon_description: 'Rose cottage',
        saon_start_number: 12,
        saon_start_number_suffix: null,
        saon_end_number: null,
        saon_end_number_suffix: null,
        saon_description: null,
        street: 'Street',
        locality: null,
        town: 'Town',
        postcode: '1AA A11',
        country_code: null,
        preferred_contact_method_ind: 'N',
        email: 'example@example.com',
        email_preferred_ind: 'N',
        mobile_number: '+44 11111 11111',
        mobile_preferred_ind: 'Y',
        landline: null,
        landline_preferred_ind: null,
        srabpi_plantid: null
      },
      {
        party_id: 'C234567',
        customer_type: 'PERSON',
        title: 'Mrs',
        first_name: 'Roberta',
        second_name: null,
        last_name: 'Farmer',
        organisation_name: null,
        primary_contact_full_name: null,
        paon_start_number: null,
        paon_start_number_suffix: null,
        paon_end_number: null,
        paon_end_number_suffix: null,
        paon_description: null,
        saon_start_number: null,
        saon_start_number_suffix: null,
        saon_end_number: null,
        saon_end_number_suffix: null,
        saon_description: null,
        street: null,
        locality: null,
        town: null,
        postcode: null,
        country_code: null,
        preferred_contact_method_ind: null,
        email: null,
        email_preferred_ind: null,
        mobile_number: null,
        mobile_preferred_ind: null,
        landline: '+44 1111 11111',
        landline_preferred_ind: 'Y',
        srabpi_plantid: null
      }
    ])

    const customers = await findCustomers(
      /** @type {any} */ ({}),
      ['C234567', 'C123456'],
      'PERSON'
    )

    expect(executeSpy).toHaveBeenCalledTimes(1)
    expect(customers).toEqual([
      {
        type: 'customers',
        id: 'C234567',
        title: 'Mrs',
        firstName: 'Roberta',
        middleName: null,
        lastName: 'Farmer',
        addresses: [],
        contactDetails: [
          {
            type: 'landline',
            phoneNumber: '+44 1111 11111',
            isPreferred: true
          }
        ],
        relationships: {
          srabpiPlants: {
            data: []
          }
        }
      },
      {
        type: 'customers',
        id: 'C123456',
        title: 'Mr',
        firstName: 'Bert',
        middleName: null,
        lastName: 'Farmer',
        addresses: [
          {
            primaryAddressableObject: {
              startNumber: 12,
              startNumberSuffix: null,
              endNumber: null,
              endNumberSuffix: null,
              description: 'Rose cottage'
            },
            secondaryAddressableObject: {
              startNumber: 12,
              startNumberSuffix: null,
              endNumber: null,
              endNumberSuffix: null,
              description: null
            },
            street: 'Street',
            locality: null,
            town: 'Town',
            postcode: '1AA A11',
            countryCode: null,
            isPreferred: false
          }
        ],
        contactDetails: [
          {
            type: 'email',
            emailAddress: 'example@example.com',
            isPreferred: false
          },
          {
            type: 'mobile',
            phoneNumber: '+44 11111 11111',
            isPreferred: true
          }
        ],
        relationships: {
          srabpiPlants: {
            data: []
          }
        }
      }
    ])
  })

  test('throws when PERSON query unexpectedly returns organisation rows', async () => {
    executeSpy.mockResolvedValue([
      {
        party_id: 'C123456',
        customer_type: 'PERSON',
        title: 'Mr',
        first_name: 'Bert',
        second_name: null,
        last_name: 'Farmer',
        organisation_name: null,
        primary_contact_full_name: null,
        paon_start_number: null,
        paon_start_number_suffix: null,
        paon_end_number: null,
        paon_end_number_suffix: null,
        paon_description: null,
        saon_start_number: null,
        saon_start_number_suffix: null,
        saon_end_number: null,
        saon_end_number_suffix: null,
        saon_description: null,
        street: null,
        locality: null,
        town: null,
        postcode: null,
        country_code: null,
        preferred_contact_method_ind: null,
        email: null,
        email_preferred_ind: null,
        mobile_number: null,
        mobile_preferred_ind: null,
        landline: null,
        landline_preferred_ind: null,
        srabpi_plantid: null
      },
      {
        party_id: 'O123456',
        customer_type: 'ORGANISATION',
        title: null,
        first_name: null,
        second_name: null,
        last_name: null,
        organisation_name: 'Acme Farms Ltd',
        primary_contact_full_name: 'Jane Contact',
        paon_start_number: null,
        paon_start_number_suffix: null,
        paon_end_number: null,
        paon_end_number_suffix: null,
        paon_description: null,
        saon_start_number: null,
        saon_start_number_suffix: null,
        saon_end_number: null,
        saon_end_number_suffix: null,
        saon_description: null,
        street: null,
        locality: null,
        town: null,
        postcode: null,
        country_code: null,
        preferred_contact_method_ind: null,
        email: null,
        email_preferred_ind: null,
        mobile_number: null,
        mobile_preferred_ind: null,
        landline: null,
        landline_preferred_ind: null,
        srabpi_plantid: null
      }
    ])

    await expect(
      findCustomers(/** @type {any} */ ({}), ['C123456', 'O123456'], 'PERSON')
    ).rejects.toThrow(/toPerson expected a PERSON row/i)
  })

  test('throws not implemented when customerType is ORGANISATION', async () => {
    executeSpy.mockClear()

    await expect(
      findCustomers(/** @type {any} */ ({}), ['O123456'], 'ORGANISATION')
    ).rejects.toThrow(/not implemented/i)

    expect(executeSpy).not.toHaveBeenCalled()
  })
})
