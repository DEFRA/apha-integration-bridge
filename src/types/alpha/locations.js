import Joi from 'joi'

import { baseData, relationshipToOne } from './helpers.js'

export const LocationsData = Joi.object({
  type: Joi.string()
    .valid('locations')
    .required()
    .label('Location Type')
    .description('The “type” value will be "locations" for this endpoint.'),
  id: Joi.string().required().label('Location ID')
})

export const LocationsRelationship = relationshipToOne(
  baseData({
    plural: 'locations',
    singular: 'location'
  })
)

const LiveStockUnits = baseData({
  plural: 'animal-commodities',
  singular: 'animal-commodity'
})
  .keys({
    animalQuantities: Joi.number()
      .min(0)
      .integer()
      .required()
      .description('Number of animals within the livestock unit')
  })
  .label('Livestock unit')

const AddressableObjectData = Joi.object({
  startNumber: Joi.number()
    .allow(null)
    .required()
    .description(
      'The first number of an address range (if endNumber is defined) or the address number (if endNumber is not defined)'
    ),
  startNumberSuffix: Joi.number()
    .allow(null)
    .required()
    .description(
      'A suffix to the first number of an address range (if endNumber is defined) or to the address number (if endNumber is not defined)'
    ),
  endNumber: Joi.number()
    .allow(null)
    .required()
    .description('The second number in an address range'),
  endNumberSuffix: Joi.number()
    .allow(null)
    .required()
    .description('A suffix to the second number of an address range'),
  description: Joi.string()
    .allow(null)
    .required()
    .description('A text description of the addressable object')
}).required()

export const Address = Joi.object({
  primaryAddressableObject: AddressableObjectData.label(
    'Primary addressable object'
  ).description(
    'Defines the top-level address object - e.g. a house, a block of flats, a premises'
  ),
  secondaryAddressableObject: AddressableObjectData.label(
    'Secondary addressable object'
  ).description(
    'Defines a sub-address - e.g. a flat, or a specific building on a premises'
  ),

  street: Joi.string().allow(null).required(),
  locality: Joi.string().allow(null).required(),
  town: Joi.string().allow(null).required(),
  // DSFAAP-2110 - not needed
  // > commented because not strictly necessary for WFM first use case
  // > unless this is what is meant by local authority
  // administrativeAreaCounty: Joi.string().allow(null, ''), // maps ADMINISTRATIVE_AREA
  postcode: Joi.string().allow(null).required(),
  // ukInternalCode: Joi.string().allow(null).required(), // not sure what this is?
  countryCode: Joi.string().allow(null).required()
})

export const Locations = baseData({
  singular: 'location',
  plural: 'locations'
}).keys({
  address: Address.required()
    .label('Address')
    .description('Address of the location'),
  osMapReference: Joi.string().required().label('OS map reference'),
  livestockUnits: Joi.array()
    .items(LiveStockUnits)
    .required()
    .label('Livestock units'),
  relationships: Joi.object({}).required()
})
