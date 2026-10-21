import Joi from 'joi'
import { baseData, relationshipToOne, relationshipToMany } from './helpers.js'
import { Address } from '../address.js'

/**
 * @typedef {{
 *   type: 'locations'
 *   id: string
 *   name: string | null
 *   status: object | null
 *   address: object
 *   addresses: object[]
 *   osMapReference: string | null
 *   position: object | null
 *   subLocations: object[]
 *   livestockUnits: object[]
 *   facilities: object[]
 *   relationships: object
 * }} Locations
 */

export const FeatureStatus = Joi.object({
  code: Joi.string()
    .required()
    .description(
      'SAM feature status code, for example COMPLETE, PARTIAL or MIGRATED'
    ),
  reasonCode: Joi.string()
    .required()
    .allow(null)
    .description(
      'For a MIGRATED feature, the system it came from, for example VETNETDATAMIG'
    ),
  since: Joi.string()
    .required()
    .description('Start of the current state, as a UTC timestamp')
})
  .allow(null)
  .description('The current SAM feature state; `null` when SAM records none')
  .label('Feature status')

export const Position = Joi.object({
  easting: Joi.number().integer().required().allow(null),
  northing: Joi.number().integer().required().allow(null),
  osMapReference: Joi.string().required().allow(null),
  pointType: Joi.string()
    .required()
    .allow(null)
    .description('SAM feature point type, for example ACCESSPOINT or NOTKNOWN')
})
  .allow(null)
  .description(
    'The current primary point as SAM stores it, in British National Grid eastings and northings (metres), usually to the nearest 100 m; `null` when SAM has no point'
  )
  .label('Position')

export const SubLocation = baseData({
  plural: 'sub-locations',
  singular: 'sub-location'
})
  .keys({
    name: Joi.string().required().allow(null),
    subLocationType: Joi.string()
      .required()
      .allow(null)
      .description('SAM sub-location type, for example BROILERSHED or FIELD'),
    usableArea: Joi.number().required().allow(null),
    usualStockQuantity: Joi.number().integer().required().allow(null),
    broilerStockingDensityRange: Joi.string().required().allow(null),
    status: FeatureStatus.required(),
    position: Position.required()
  })
  .description(
    'A building, field or shed of the premises. `id` is the SAM feature key; sub-locations have no `L` number'
  )
  .label('Sub-location')

const LocationAddress = Address.keys({
  isPreferred: Joi.boolean()
    .required()
    .description(
      'True on the address in `address`: postal first, then the latest start date, then the highest SAM key'
    ),
  from: Joi.string()
    .required()
    .description("Start of the address's use for this location")
}).label('Location address')

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

const HoldingsRelationship = relationshipToMany(
  baseData({
    plural: 'holdings',
    singular: 'holding'
  })
)

export const LocationsSchema = LocationsData.keys({
  type: Joi.string().valid('locations').required().label('Type'),
  id: Joi.string().required().label('Location ID'),
  name: Joi.string().allow(null).required().label('Location name'),
  status: FeatureStatus.required(),
  address: Address.required()
    .label('Address')
    .description(
      'The preferred current address; every member is `null` when SAM holds none'
    ),
  addresses: Joi.array()
    .items(LocationAddress)
    .required()
    .description(
      'Every current address; `isPreferred` marks the one in `address`. Empty when SAM holds none'
    ),
  osMapReference: Joi.string().allow(null).required().label('OS map reference'),
  position: Position.required(),
  subLocations: Joi.array()
    .items(SubLocation)
    .required()
    .description('Buildings, fields and sheds of the premises'),
  livestockUnits: Joi.array()
    .items(LiveStockUnits)
    .required()
    .label('Livestock units'),
  facilities: Joi.array().items(Facilities).required().label('Facilities'),
  relationships: Joi.object({
    holdings: HoldingsRelationship.description('Holdings using this location')
  }).required()
}).label('Locations Data')
