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
  countryCode: null
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
      isPreferred: true
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

const noAddressableObject = {
  startNumber: null,
  startNumberSuffix: null,
  endNumber: null,
  endNumberSuffix: null,
  description: null
}

const address2 = {
  primaryAddressableObject: {
    ...noAddressableObject,
    description: 'Pinfold Farm'
  },
  secondaryAddressableObject: noAddressableObject,
  street: 'Wheelwright Lane',
  locality: 'Westham',
  town: 'Ashbourne',
  county: 'Derbyshire',
  postcode: 'DE6 1AA',
  countryCode: 'GB',
  ukInternalCode: 'ENG',
  isPreferred: true
}

const address3 = {
  primaryAddressableObject: {
    ...noAddressableObject,
    description: 'High Barn'
  },
  secondaryAddressableObject: noAddressableObject,
  street: 'Moor Road',
  locality: null,
  town: 'Ashbourne',
  county: 'Derbyshire',
  postcode: 'DE6 3CC',
  countryCode: 'GB',
  ukInternalCode: 'ENG',
  isPreferred: true
}

const address4 = {
  primaryAddressableObject: {
    ...noAddressableObject,
    description: 'Hollins Cottage'
  },
  secondaryAddressableObject: noAddressableObject,
  street: 'Hollins Lane',
  locality: 'Kniveton',
  town: 'Ashbourne',
  county: 'Derbyshire',
  postcode: 'DE6 5EE',
  countryCode: 'GB',
  ukInternalCode: 'ENG',
  isPreferred: true
}

export const customer3 = {
  type: 'customers',
  id: 'C1012565',
  partyType: 'PERSON',
  title: 'Mr',
  firstName: 'Robert',
  middleName: null,
  lastName: 'Hartley',
  roles: [
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'CPHHOLDER',
      roleName: 'CPH Holder',
      from: '2015-01-01'
    },
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'LIVESTOCKKEEPER',
      roleName: 'Livestock Keeper',
      from: '2015-01-01'
    }
  ],
  addresses: [address2],
  contactDetails: [
    {
      type: 'mobile',
      phoneNumber: '07700 900000',
      isPreferred: true,
      usageType: 'HOME'
    },
    {
      type: 'mobile',
      phoneNumber: '07700 900001',
      isPreferred: false,
      usageType: null
    },
    {
      type: 'email',
      emailAddress: 'r.hartley@example.com',
      isPreferred: false,
      usageType: 'CORRESPONDENCE'
    },
    {
      type: 'fax',
      faxNumber: '01234 567890',
      isPreferred: false,
      usageType: null
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const customer4 = {
  type: 'customers',
  id: 'C2000311',
  partyType: 'PERSON',
  title: 'Mrs',
  firstName: 'Anne',
  middleName: null,
  lastName: 'Whitworth',
  roles: [
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'CPHHOLDER',
      roleName: 'CPH Holder',
      from: '2012-06-15'
    }
  ],
  addresses: [address3],
  contactDetails: [
    {
      type: 'landline',
      phoneNumber: '01632 960112',
      isPreferred: true,
      usageType: 'HOME'
    },
    {
      type: 'email',
      emailAddress: 'a.whitworth@example.com',
      isPreferred: false,
      usageType: null
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const customer5 = {
  type: 'customers',
  id: 'C3108876',
  partyType: 'PERSON',
  title: 'Mr',
  firstName: 'Peter',
  middleName: 'John',
  lastName: 'Ashworth',
  roles: [
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'CPHHOLDER',
      roleName: 'CPH Holder',
      from: '2023-08-14'
    }
  ],
  addresses: [address4],
  contactDetails: [
    {
      type: 'mobile',
      phoneNumber: '07700 900321',
      isPreferred: true,
      usageType: null
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const all = [customer1, customer2, customer3, customer4, customer5]
