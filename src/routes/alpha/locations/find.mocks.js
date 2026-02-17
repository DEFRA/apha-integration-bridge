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

export const all = [location1, location2]
