import Joi from 'joi'
import { baseData, relationshipToOne } from './helpers.js'
import { Address } from '../address.js'

/**
 * @typedef {{
 *   type: 'locations'
 *   id: string
 *   name: string | null
 *   address: object
 *   osMapReference: string | null
 *   livestockUnits: object[]
 *   facilities: object[]
 *   relationships: object
 * }} Locations
 */

export const LocationsRelationship = relationshipToOne(
  baseData({
    plural: 'locations',
    singular: 'location'
  })
)

const LocationsData = baseData({
  plural: 'locations',
  singular: 'location'
}).meta({ response: { type: 'locations' } })

const LiveStockUnits = baseData({
  plural: 'animal-commodities',
  singular: 'animal-commodity'
})
  .keys({
    animalQuantities: Joi.number()
      .min(0)
      .integer()
      .required()
      .description('Number of animals within the livestock unit'),
    species: Joi.string()
      .required()
      .allow(null)
      .label('Species')
      .description('Species of animals within the livestock unit')
  })
  .label('Livestock unit')

const Facilities = baseData({
  plural: 'facilities',
  singular: 'facility'
})
  .keys({
    name: Joi.string().required().allow(null).label('Facility name'),
    facilityType: Joi.string()
      .required()
      .allow(null)
      .label('Facility type')
      .description(
        `The category of facility - e.g. an 'Animal Breeding' or 'ABP Establishment, Plant or Operator'`
      ),
    businessActivity: Joi.string()
      .required()
      .allow(null)
      .label('Business activity')
      .description(
        'A description of the type of business undertaken on the premises'
      )
  })
  .label('Facility')

export const LocationsSchema = LocationsData.keys({
  type: Joi.string().valid('locations').required().label('Type'),
  id: Joi.string().required().label('Location ID'),
  name: Joi.string().required().allow(null).label('Location name'),
  address: Address.required()
    .label('Address')
    .description('Address of the location'),
  osMapReference: Joi.string().allow(null).required().label('OS map reference'),
  livestockUnits: Joi.array()
    .items(LiveStockUnits)
    .required()
    .label('Livestock units'),
  facilities: Joi.array().items(Facilities).required().label('Facilities'),
  relationships: Joi.object({}).required()
}).label('Locations Data')
