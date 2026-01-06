import { HTTPObjectResponse } from '../../lib/http/http-response.js'

export const customer1 = new HTTPObjectResponse('customers', 'C123456', {
  subType: 'ORGANISATION',
  businessName: 'Mr and Mrs. M J & S C Pugh',
  address: {
    paonStartNumber: 12,
    paonStartNumberSuffix: null,
    paonEndNumber: null,
    paonEndNumberSuffix: '',
    paonDescription: '',
    saonDescription: '',
    saonStartNumber: null,
    saonStartNumberSuffix: null,
    saonEndNumber: null,
    saonEndNumberSuffix: '',
    street: '',
    locality: null,
    town: '',
    administrativeAreaCounty: '',
    postcode: '',
    countryCode: ''
  },
  contactDetails: {
    primary: {
      fullName: 'Mr. M J Pugh',
      emailAddress: 'mjpugh@example.com',
      phoneNumber: '07111 111111'
    },
    secondary: {
      fullName: 'Mrs. S C Pugh'
    }
  }
})

export const customer2 = new HTTPObjectResponse('customers', 'C234567', {
  subType: 'ORGANISATION',
  businessName: 'Barney McGrue',
  address: {
    paonStartNumber: 12,
    paonStartNumberSuffix: null,
    paonEndNumber: null,
    paonEndNumberSuffix: '',
    paonDescription: '',
    saonDescription: '',
    saonStartNumber: null,
    saonStartNumberSuffix: null,
    saonEndNumber: null,
    saonEndNumberSuffix: '',
    street: '',
    locality: null,
    town: '',
    administrativeAreaCounty: '',
    postcode: '',
    countryCode: ''
  },
  contactDetails: {
    primary: {
      fullName: 'Barney McGrue',
      emailAddress: 'barney@example.com',
      phoneNumber: '07111 111111'
    }
  }
})

export const all = [customer1, customer2]
