import Joi from 'joi'

import { baseData } from '../find/helpers.js'

export const SuppliersData = baseData({
  plural: 'suppliers',
  singular: 'supplier'
}).meta({ response: { type: 'suppliers' } })

/**
 * A party holding a current SUPPLIER role in SAM. Person and organisation
 * name fields are both present on every item, with the inapplicable set
 * nulled, so the shape does not change with the party type.
 */
export const Supplier = SuppliersData.keys({
  supplierType: Joi.string()
    .required()
    .description('The SAM role type the supplier was matched on'),
  partyType: Joi.string()
    .required()
    .allow(null)
    .description('PERSON or ORGANISATION'),
  title: Joi.string().required().allow(null),
  firstName: Joi.string().required().allow(null),
  lastName: Joi.string().required().allow(null),
  organisationName: Joi.string().required().allow(null)
})
