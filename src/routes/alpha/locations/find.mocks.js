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

const commodity1 = {
  type: 'animal-commodities',
  id: 'U000010',
  animalQuantities: 10,
  species: 'Goats'
}

const commodity2 = {
  type: 'animal-commodities',
  id: 'U000011',
  animalQuantities: 1000,
  species: 'Sheep'
}

export const commodity3 = {
  type: 'animal-commodities',
  id: 'U000012',
  animalQuantities: 20,
  species: null
}

const facility1 = {
  type: 'facilities',
  id: 'F12345',
  name: 'Birchwood Kennels',
  facilityType: 'ABP Establishment, Plant or Operator',
  businessActivity: 'Embryo'
}

const facility2 = {
  type: 'facilities',
  id: 'F12345',
  name: 'Paws Vets',
  facilityType: 'Veterinary',
  businessActivity: 'Veterinary Practice (AH & Private work)'
}

export const location1 = {
  type: 'locations',
  id: 'L123456',
  osMapReference: 'SO1234567890',
  name: null,
  address: address1,
  livestockUnits: [commodity1],
  facilities: [facility1],
  relationships: {}
}

export const location2 = {
  type: 'locations',
  id: 'L234567',
  osMapReference: 'SO1234567890',
  name: 'Big Barn Farm',
  address: address1,
  livestockUnits: [commodity2, commodity3],
  facilities: [facility2],
  relationships: {}
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
  ukInternalCode: 'ENG'
}

const address3 = {
  primaryAddressableObject: {
    ...noAddressableObject,
    description: 'Coldwell Lane Poultry Unit'
  },
  secondaryAddressableObject: noAddressableObject,
  street: 'Coldwell Lane',
  locality: 'Brackenfield',
  town: 'Alfreton',
  county: 'Derbyshire',
  postcode: 'DE55 4DD',
  countryCode: 'GB',
  ukInternalCode: 'ENG'
}

const address4 = {
  ...address3,
  primaryAddressableObject: {
    ...noAddressableObject,
    description: 'Coldwell Farm'
  }
}

const address5 = {
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
  ukInternalCode: 'ENG'
}

// Most SAM locations have no address: every member is null.
const noAddress = {
  primaryAddressableObject: noAddressableObject,
  secondaryAddressableObject: noAddressableObject,
  street: null,
  locality: null,
  town: null,
  county: null,
  postcode: null,
  countryCode: null,
  ukInternalCode: null
}

export const location3 = {
  type: 'locations',
  id: 'L97339',
  name: 'Pinfold Farm',
  status: {
    code: 'COMPLETE',
    reasonCode: null,
    since: '2019-04-02T00:00:00Z'
  },
  address: address2,
  addresses: [{ ...address2, isPreferred: true, from: '2019-04-02' }],
  osMapReference: 'SK3530036300',
  position: {
    easting: 435300,
    northing: 336300,
    osMapReference: 'SK3530036300',
    pointType: 'ACCESSPOINT'
  },
  subLocations: [
    {
      type: 'sub-locations',
      id: '8841022',
      name: 'Shed 3',
      subLocationType: 'BROILERSHED',
      usableArea: 1240,
      usualStockQuantity: 18000,
      // The stored form of the band has not been read from SAM yet.
      broilerStockingDensityRange: '<TBC>',
      status: {
        code: 'COMPLETE',
        reasonCode: null,
        since: '2020-02-10T00:00:00Z'
      },
      position: null
    },
    {
      type: 'sub-locations',
      id: '8841023',
      name: 'Long Meadow',
      subLocationType: 'FIELD',
      usableArea: null,
      usualStockQuantity: null,
      broilerStockingDensityRange: null,
      status: {
        code: 'COMPLETE',
        reasonCode: null,
        since: '2020-02-10T00:00:00Z'
      },
      position: null
    }
  ],
  livestockUnits: [
    {
      type: 'animal-commodities',
      id: 'U000010',
      animalQuantities: 18000,
      species: 'Chickens'
    }
  ],
  facilities: [],
  relationships: {
    holdings: {
      data: [
        { type: 'holdings', id: '08/139/0167' },
        { type: 'holdings', id: '12/345/6789' }
      ]
    }
  }
}

export const location4 = {
  type: 'locations',
  id: 'L120044',
  name: 'High Barn',
  status: {
    code: 'MIGRATED',
    reasonCode: 'VETNETDATAMIG',
    since: '2008-01-31T00:00:00Z'
  },
  address: noAddress,
  addresses: [],
  osMapReference: 'SK3480039100',
  position: {
    easting: 434800,
    northing: 339100,
    osMapReference: 'SK3480039100',
    pointType: 'NOTKNOWN'
  },
  subLocations: [],
  livestockUnits: [],
  facilities: [],
  relationships: {
    holdings: { data: [{ type: 'holdings', id: '08/139/0167' }] }
  }
}

export const location5 = {
  type: 'locations',
  id: 'L104588',
  name: 'Coldwell Lane Poultry Unit',
  status: {
    code: 'COMPLETE',
    reasonCode: null,
    since: '2014-09-01T00:00:00Z'
  },
  address: address3,
  addresses: [
    { ...address3, isPreferred: true, from: '2016-03-01' },
    { ...address4, isPreferred: false, from: '2014-09-01' }
  ],
  osMapReference: 'SK3748258231',
  position: {
    easting: 437482,
    northing: 358231,
    osMapReference: 'SK3748258231',
    pointType: 'ACCESSPOINT'
  },
  subLocations: [],
  livestockUnits: [
    {
      type: 'animal-commodities',
      id: 'U000420',
      animalQuantities: 9500,
      species: 'Turkeys'
    }
  ],
  facilities: [],
  relationships: {
    holdings: { data: [{ type: 'holdings', id: '33/210/0455' }] }
  }
}

export const location6 = {
  type: 'locations',
  id: 'L151203',
  name: 'Hollins Cottage',
  status: {
    code: 'COMPLETE',
    reasonCode: null,
    since: '2023-08-14T00:00:00Z'
  },
  address: address5,
  addresses: [{ ...address5, isPreferred: true, from: '2023-08-14' }],
  osMapReference: 'SK1841647306',
  position: {
    easting: 418416,
    northing: 347306,
    osMapReference: 'SK1841647306',
    pointType: 'ACCESSPOINT'
  },
  subLocations: [],
  livestockUnits: [],
  facilities: [],
  relationships: {
    holdings: { data: [{ type: 'holdings', id: '21/087/0042' }] }
  }
}

export const all = [
  location1,
  location2,
  location3,
  location4,
  location5,
  location6
]
