import Joi from 'joi'
import { baseData, relationshipToOne } from './helpers.js'
import { LocationsRelationship } from './locations.js'
import { CustomerRelationship } from './customers.js'

/**
 * @typedef {{
 *   type: 'holdings'
 *   id: string
 *   localAuthority: string | null
 *   relationships: {
 *    location: object
 *    cphHolder: object
 *    }
 * }} Holdings
 */

export const HoldingsRelationship = relationshipToOne(
  baseData({
    plural: 'holdings',
    singular: 'holding'
  })
)

const HoldingsData = baseData({
  plural: 'holdings',
  singular: 'holding'
}).meta({ response: { type: 'holdings' } })

export const HoldingsSchema = HoldingsData.keys({
  type: Joi.string().valid('holdings').required().label('Type'),
  id: Joi.string().required().label('CPH'),
  localAuthority: Joi.string().required().allow(null).label('Local Authority'),
  relationships: Joi.object({
    location: LocationsRelationship,
    cphHolder: CustomerRelationship.description('The owner of the holding')
  }).required()
}).label('Holdings Data')
