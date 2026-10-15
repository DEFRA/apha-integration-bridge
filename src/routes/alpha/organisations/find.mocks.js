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
  organisationName: 'Soil testing lab',
  address: address1,
  contactDetails: {
    primaryContact: {
      fullName: 'Sally Scientist',
      emailAddress: null,
      phoneNumber: '+44 1111 11111'
    },
    secondaryContact: {
      fullName: null,
      emailAddress: null,
      phoneNumber: null
    }
  },
  relationships: {
    srabpiPlants: {
      data: [
        {
          type: 'srabpi-plants',
          id: 'SP123456'
        }
      ]
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

export const organisation3 = {
  type: 'organisations',
  id: 'C2231044',
  organisationName: 'Pinfold Farms Ltd',
  organisationType: 'NOTKNOWN',
  roles: [
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'LANDOWNER',
      roleName: 'Land Owner',
      from: '2010-06-01'
    }
  ],
  address: {
    primaryAddressableObject: { ...noAddressableObject, startNumber: 1 },
    secondaryAddressableObject: noAddressableObject,
    street: 'Enterprise Way',
    locality: null,
    town: 'Ashbourne',
    county: 'Derbyshire',
    postcode: 'DE6 2BB',
    countryCode: 'GB',
    ukInternalCode: 'ENG'
  },
  contactDetails: {
    primaryContact: {
      fullName: 'J Hartley',
      emailAddress: null,
      phoneNumber: null
    },
    secondaryContact: {
      fullName: null,
      emailAddress: null,
      phoneNumber: null
    }
  },
  contactMethods: [
    {
      type: 'landline',
      phoneNumber: '01234 500100',
      isPreferred: true,
      usageType: 'PLACEOFBUSINESS'
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

export const organisation4 = {
  type: 'organisations',
  id: 'C7781002',
  organisationName: 'Coldwell Poultry Ltd',
  organisationType: 'NOTKNOWN',
  roles: [
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'CPHHOLDER',
      roleName: 'CPH Holder',
      from: '2008-04-01'
    },
    {
      mainRoleType: 'CUSTOMER',
      roleType: 'LIVESTOCKKEEPER',
      roleName: 'Livestock Keeper',
      from: '2008-04-01'
    }
  ],
  address: {
    primaryAddressableObject: {
      ...noAddressableObject,
      description: 'Coldwell House'
    },
    secondaryAddressableObject: noAddressableObject,
    street: 'Coldwell Lane',
    locality: 'Brackenfield',
    town: 'Alfreton',
    county: 'Derbyshire',
    postcode: 'DE55 4DD',
    countryCode: 'GB',
    ukInternalCode: 'ENG'
  },
  contactDetails: {
    primaryContact: {
      fullName: 'Karen Doyle',
      emailAddress: 'k.doyle@example.com',
      phoneNumber: '01632 960410'
    },
    secondaryContact: {
      fullName: 'Tom Reid',
      emailAddress: null,
      phoneNumber: '07700 900415'
    }
  },
  contactMethods: [
    {
      type: 'landline',
      phoneNumber: '01632 960410',
      isPreferred: true,
      usageType: 'PLACEOFBUSINESS'
    },
    {
      type: 'email',
      emailAddress: 'office@example.com',
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

export const all = [organisation1, organisation2, organisation3, organisation4]
