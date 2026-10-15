import Joi from 'joi'

import { Address } from '../address.js'

/**
 * The structured BS7666 address with the proposed `ukInternalCode`. Once
 * `countryCode` carries SAM's country code, the UK nation code moves here.
 */
export const StructuredAddress = Address.keys({
  ukInternalCode: Joi.string()
    .allow(null)
    .description('UK nation or Crown Dependency code as stored by SAM')
}).label('Structured address')

export const PartyAddress = StructuredAddress.keys({
  isPreferred: Joi.boolean()
    .required()
    .description("SAM's preferred-contact indicator for this address")
}).label('Party address')

export const LocationAddress = StructuredAddress.keys({
  isPreferred: Joi.boolean()
    .required()
    .description(
      'Derived by the API: true on the address chosen by postal address first, then latest start date, then highest SAM key. The same address populates `address`.'
    ),
  from: Joi.string()
    .required()
    .description("Start of the address's use for this location")
}).label('Location address')
