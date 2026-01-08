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
    // DSFAAP-2110
    // > removed because not directly needed for WFM use case
    // administrativeAreaCounty: '',
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
  },
  relationships: {}
})

export const customer2 = new HTTPObjectResponse('customers', 'C234567', {
  subType: 'PERSON',
  title: 'Mr',
  firstName: 'John',
  middleName: 'Chris',
  lastName: 'Briggs',
  addresses: [
    {
      paonStartNumber: 12,
      paonStartNumberSuffix: null,
      paonEndNumber: '',
      paonEndNumberSuffix: '',
      paonDescription: '',
      saonDescription: '',
      saonStartNumber: '',
      saonStartNumberSuffix: null,
      saonEndNumber: '',
      saonEndNumberSuffix: '',
      street: '',
      locality: null,
      town: '',
      // DSFAAP-2110
      // > removed because not directly needed for WFM use case
      // administrativeAreaCounty: '',
      postcode: '',
      countryCode: '',
      isPreferred: false
    },
    {
      paonStartNumber: 12,
      paonStartNumberSuffix: null,
      paonEndNumber: '',
      paonEndNumberSuffix: '',
      paonDescription: '',
      saonDescription: '',
      saonStartNumber: '',
      saonStartNumberSuffix: null,
      saonEndNumber: '',
      saonEndNumberSuffix: '',
      street: '',
      locality: null,
      town: '',
      // DSFAAP-2110
      // > removed because not directly needed for WFM use case
      // administrativeAreaCounty: '',
      postcode: '',
      countryCode: '',
      isPreferred: true
    }
  ],
  contactDetails: [
    {
      type: 'MOBILE',
      number: '07756896588',
      isPreferred: true
    },
    {
      type: 'LANDLINE',
      number: '01856891000',
      isPreferred: false
    },
    {
      type: 'EMAIL',
      address: 'contactme@mygreatfarm.co.uk',
      isPreferred: false
    }
  ],
  relationships: {
    srabpiPlant: {
      data: {
        id: 'S12345',
        type: 'srabpi-plants'
      }
    }
  }
})

export const all = [customer1, customer2]
