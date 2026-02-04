import Joi from 'joi'
import { baseData, relationshipToOne } from './helpers.js'
import { LocationsRelationship } from './locations.js'
import { CustomerRelationship } from './customers.js'

export const HoldingsRelationship = relationshipToOne(
  baseData({
    plural: 'holdings',
    singular: 'holding'
  })
)

const HoldingsData = baseData({
  plural: 'holdings',
  singular: 'holding'
})

export const Holdings = HoldingsData.keys({
  cphType: Joi.string().required().label('CPH Type'),
  localAuthority: Joi.string().required().label('Local Authority'),
  relationships: Joi.object({
    location: LocationsRelationship,
    cphHolder: CustomerRelationship.description('The owner of the holding')
  }).required()
}).label('Holdings Data')
