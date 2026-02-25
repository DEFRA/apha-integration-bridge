import { expect, test } from '@jest/globals'

import { createCustomer } from './create-customer.js'

test('createCustomer maps a person row into the customer response skeleton', () => {
  const customer = createCustomer(
    {
      title: 'Mr',
      first_name: 'Bert',
      second_name: null,
      last_name: 'Farmer',
      organisation_name: null,
      primary_contact_full_name: null
    },
    'C123456'
  )

  expect(customer).toEqual({
    type: 'customers',
    id: 'C123456',
    title: 'Mr',
    firstName: 'Bert',
    middleName: null,
    lastName: 'Farmer',
    addresses: [],
    contactDetails: [],
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  })
})

test('createCustomer throws if first_name or last_name is missing', () => {
  expect(() =>
    createCustomer(
      {
        title: null,
        first_name: null,
        second_name: null,
        last_name: null,
        organisation_name: 'Acme Farms Ltd',
        primary_contact_full_name: 'Jane Contact'
      },
      'C777777'
    )
  ).toThrow(/first_name.*last_name/i)
})
