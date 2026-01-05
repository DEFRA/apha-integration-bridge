import { HTTPObjectResponse } from '../../lib/http/http-response.js'

const customer1 = new HTTPObjectResponse('customers', 'C123456', {
  type: 'customers',
  id: 'C123456',
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
      fullName: 'Mr. M J Pugh'
    },
    secondary: {
      fullName: 'Mrs. S C Pugh'
    }
  }
})

export const all = [customer1]
