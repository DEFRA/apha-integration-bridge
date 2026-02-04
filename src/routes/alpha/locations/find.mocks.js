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

const commodity1 = {
  type: 'animal-commodities',
  id: 'U000010',
  animalQuantities: 10
}

const commodity2 = {
  type: 'animal-commodities',
  id: 'U000011',
  animalQuantities: 1000
}

export const commodity3 = {
  type: 'animal-commodities',
  id: 'U000012',
  animalQuantities: 20
}

export const location1 = {
  type: 'locations',
  id: 'L123456',
  osMapReference: 'SO1234567890',
  address: address1,
  livestockUnits: [commodity1],
  relationships: {}
}

export const location2 = {
  type: 'locations',
  id: 'L234567',
  osMapReference: 'SO1234567890',
  address: address1,
  livestockUnits: [commodity2, commodity3],
  relationships: {}
}

export const all = [location1, location2]
