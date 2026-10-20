import Joi from 'joi'

export const AddressableObjectData = Joi.object({
  startNumber: Joi.number()
    .allow(null)
    .required()
    .description(
      'The first number of an address range (if endNumber is defined) or the address number (if endNumber is not defined)'
    ),
  startNumberSuffix: Joi.string()
    .allow(null)
    .required()
    .description(
      'A suffix to the first number of an address range (if endNumber is defined) or to the address number (if endNumber is not defined). Examples: "A", "B", etc.'
    ),
  endNumber: Joi.number()
    .allow(null)
    .required()
    .description('The second number in an address range'),
  endNumberSuffix: Joi.string()
    .allow(null)
    .required()
    .description(
      'A suffix to the second number of an address range. Examples: "A", "B", etc.'
    ),
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
  county: Joi.string().allow(null),
  postcode: Joi.string().allow(null).required(),
  countryCode: Joi.string().allow(null).required()
})

/**
 * The address of the holding sub-resources, with the UK nation in
 * `countryCode`, as the find endpoints return it, and again in `ukInternalCode`
 */
export const StructuredAddress = Address.keys({
  countryCode: Joi.string()
    .allow(null)
    .required()
    .description(
      "The UK nation or Crown Dependency, SAM's UK_INTERNAL_CODE, as the find endpoints return it"
    ),
  ukInternalCode: Joi.string()
    .allow(null)
    .required()
    .description(
      'The same UK nation or Crown Dependency, under the name GET /locations/{locationId} uses'
    )
}).label('Structured address')
