const address1 = {
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
  countryCode: 'GB'
}

export const customer1 = {
  type: 'customers',
  id: 'C123456',
  title: 'Mr',
  firstName: 'Bert',
  middleName: null,
  lastName: 'Farmer',
  addresses: [address1],
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

export const customer2 = {
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
      isPreferred: false
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const all = [customer1, customer2]
