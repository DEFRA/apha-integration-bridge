import Joi from 'joi'

import { baseData } from './find/helpers.js'

const SupplierInvolvement = Joi.object({
  involvementType: Joi.string()
    .valid('OVFOR', 'DPFOR')
    .required()
    .description(
      'SAM involvement type: OVFOR for the Official Veterinarian practice, DPFOR for the Delivery Partner'
    ),
  locationId: Joi.string().required(),
  livestockUnitId: Joi.string().required(),
  from: Joi.string()
    .required()
    .allow(null)
    .description('Start of the involvement')
}).label('Supplier involvement')

/**
 * An item of `GET /holdings/{countyId}/{parishId}/{holdingId}/suppliers`: a
 * supplier in the shape of the alpha supplier search, plus one involvement per
 * livestock unit and involvement type.
 */
export const HoldingSupplier = baseData({
  plural: 'suppliers',
  singular: 'supplier'
})
  .keys({
    supplierTypes: Joi.array()
      .items(Joi.string())
      .min(1)
      .required()
      .description(
        'The SAM supplier role types behind its involvements, for example OVPRACTICE or DELIVERYPARTNER'
      ),
    partyType: Joi.string()
      .valid('PERSON', 'ORGANISATION')
      .required()
      .allow(null)
      .description('`null` when SAM records no current party version'),
    title: Joi.string().required().allow(null),
    firstName: Joi.string().required().allow(null),
    lastName: Joi.string().required().allow(null),
    organisationName: Joi.string().required().allow(null),
    involvements: Joi.array().items(SupplierInvolvement).min(1).required()
  })
  .label('Holding supplier')
