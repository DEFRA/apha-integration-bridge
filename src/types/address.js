import Joi from 'joi'

export const AddressableObjectData = Joi.object({
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
  postcode: Joi.string().allow(null).required(),
  countryCode: Joi.string().allow(null).required()
})
