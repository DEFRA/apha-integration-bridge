import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
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

test('createCustomer masks name fields when masking context is active', () => {
  runWithMaskingContext({ shouldMask: true }, () => {
    const customer = createCustomer(
      {
        title: 'Mr',
        first_name: 'Bert',
        second_name: 'Albert',
        last_name: 'Farmer',
        organisation_name: null,
        primary_contact_full_name: null
      },
      'C123456'
    )

    expect(customer).toMatchObject({
      title: '**',
      firstName: '****',
      middleName: 'A****t',
      lastName: 'F****r'
    })
  })
})

test('createCustomer maps a person row with no first_name (null given name)', () => {
  const customer = createCustomer(
    {
      title: 'Mr',
      first_name: null,
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
    firstName: null,
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

test('createCustomer maps a person row with no last_name (null family name)', () => {
  const customer = createCustomer(
    {
      title: 'Mr',
      first_name: 'Bert',
      second_name: null,
      last_name: null,
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
    lastName: null,
    addresses: [],
    contactDetails: [],
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  })
})
