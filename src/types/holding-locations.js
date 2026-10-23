import Joi from 'joi'

import { Address } from './address.js'
import { baseData } from './find/helpers.js'
import { LocationsSchema } from './find/locations.js'

const FeatureStatus = Joi.object({
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
    .allow(null)
    .description('Start of the current state, as a UTC timestamp')
})
  .allow(null)
  .description('The current SAM feature state; `null` when SAM records none')
  .label('Feature status')

const Position = Joi.object({
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
    'The current primary point as SAM stores it, in British National Grid eastings and northings (metres); `null` when SAM has no point'
  )
  .label('Position')

const SubLocation = baseData({
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
    usualStockQuantity: Joi.number().required().allow(null),
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
    .allow(null)
    .description("Start of the address's use for this location")
}).label('Location address')

const Holdership = Joi.object({
  vetnetCoreId: Joi.string()
    .required()
    .description(
      "SAM's Vetnet core id. With the CPH it identifies the holdership"
    ),
  from: Joi.string()
    .required()
    .allow(null)
    .description('Start of the holdership'),
  cphType: Joi.string()
    .required()
    .allow(null)
    .description("The holdership's CPH type"),
  selected: Joi.boolean()
    .required()
    .description(
      'True on the holdership `POST /holdings/find` reports: the latest `from`, then the highest SAM key'
    )
}).label('Holdership')

/**
 * An item of `GET /holdings/{countyId}/{parishId}/{holdingId}/locations`: the
 * location as `POST /locations/find` returns it, with its status, position,
 * addresses and sub-locations, plus the holdership that links it to the CPH.
 */
export const HoldingLocation = LocationsSchema.keys({
  address: Address.required().description(
    'The preferred current address; every member is `null` when SAM holds none'
  ),
  status: FeatureStatus.required(),
  addresses: Joi.array()
    .items(LocationAddress)
    .required()
    .description(
      'Every current address; `isPreferred` marks the one in `address`. Empty when SAM holds none'
    ),
  position: Position.required(),
  subLocations: Joi.array()
    .items(SubLocation)
    .required()
    .description('Buildings, fields and sheds of the premises'),
  holdership: Holdership.required()
}).label('Holding location')
