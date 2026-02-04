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

export const organisation1 = {
  type: 'organisations',
  id: 'O123456',
  organisationName: 'Farming Ltd',
  address: address1,
  contactDetails: {
    primaryContact: {
      fullName: 'Bob Farmer',
      emailAddress: null,
      phoneNumber: '+44 1111 11111'
    },
    secondaryContact: {
      fullName: 'Roberta Farmer',
      emailAddress: 'example@example.com',
      phoneNumber: null
    }
  },
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const organisation2 = {
  type: 'organisations',
  id: 'O234567',
  organisationName: 'Farming Ltd',
  address: address1,
  contactDetails: {
    primaryContact: {
      fullName: 'Bob Farmer',
      emailAddress: null,
      phoneNumber: '+44 1111 11111'
    },
    secondaryContact: {
      fullName: 'Roberta Farmer',
      emailAddress: 'example@example.com',
      phoneNumber: null
    }
  },
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const all = [organisation1, organisation2]
