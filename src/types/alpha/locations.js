import Joi from 'joi'

import { baseData, relationshipToMany, relationshipToOne } from './helpers.js'
import { LocationAddress, StructuredAddress } from './address.js'

export const LocationsData = Joi.object({
  type: Joi.string()
    .valid('locations')
    .required()
    .label('Location Type')
    .description('The “type” value will be "locations" for this endpoint.'),
  id: Joi.string().required().label('Location ID')
})

export const LocationsRelationship = relationshipToOne(
  baseData({
    plural: 'locations',
    singular: 'location'
  })
)

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

export const FeatureStatus = Joi.object({
  code: Joi.string()
    .required()
    .description(
      'SAM feature status code: COMPLETE, PARTIAL or MIGRATED, a retired code still on records migrated in 2008. Inactive locations are not returned'
    ),
  reasonCode: Joi.string()
    .required()
    .allow(null)
    .description(
      'For a MIGRATED feature, the system it came from, for example VETNETDATAMIG'
    ),
  since: Joi.string()
    .required()
    .description('Start of the current state (SAM timestamp, UTC)')
})
  .allow(null)
  .description(
    'Proposed. The current SAM feature state. `null` when SAM records none'
  )
  .label('Feature status')

export const Position = Joi.object({
  easting: Joi.number().integer().required().allow(null),
  northing: Joi.number().integer().required().allow(null),
  osMapReference: Joi.string()
    .required()
    .allow(null)
    .description(
      'Ordnance Survey map reference as stored, usually two letters and ten digits without spaces'
    ),
  pointType: Joi.string()
    .required()
    .allow(null)
    .description(
      'SAM feature point type: NOTKNOWN (a retired code, on most points), ACCESSPOINT, BUILDING, CENTROID or UNITLOCATION'
    )
})
  .allow(null)
  .description(
    'Proposed. The current primary point SAM records, as British National Grid (EPSG:27700) eastings and northings in metres. `null` when SAM has no point'
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
      .description(
        'SAM sub-location type, for example BROILERSHED, BARN, BUILDINGS or FIELD'
      ),
    usableArea: Joi.number()
      .required()
      .allow(null)
      .description('Broiler sheds only. Usable area as stored by SAM'),
    usualStockQuantity: Joi.number()
      .integer()
      .required()
      .allow(null)
      .description('Broiler sheds only. Usual number of animals kept here'),
    broilerStockingDensityRange: Joi.string()
      .required()
      .allow(null)
      .description(
        'Broiler sheds only. EU Broiler Directive stocking-density band as SAM stores it'
      ),
    status: FeatureStatus.required(),
    position: Position.required(),
    address: LocationAddress.description(
      'Omitted when the sub-location has no address of its own'
    )
  })
  .description(
    'A building, field or shed of the premises. `id` is the SAM feature key; sub-locations have no `L` number'
  )

const HoldingsRelationship = relationshipToMany(
  baseData({
    plural: 'holdings',
    singular: 'holding'
  })
)

export const Locations = baseData({
  singular: 'location',
  plural: 'locations'
}).keys({
  name: Joi.string().required().allow(null).label('Location name'),
  status: FeatureStatus,
  address: StructuredAddress.required()
    .label('Address')
    .description('Address of the location'),
  addresses: Joi.array()
    .items(LocationAddress)
    .description(
      'Proposed. Every current address; `isPreferred` marks the one in `address`. Empty when SAM holds none'
    ),
  osMapReference: Joi.string().required().allow(null).label('OS map reference'),
  position: Position,
  subLocations: Joi.array()
    .items(SubLocation)
    .description('Proposed. Buildings, fields and sheds of the premises'),
  livestockUnits: Joi.array()
    .items(LiveStockUnits)
    .required()
    .label('Livestock units'),
  facilities: Joi.array().items(Facilities).required().label('Facilities'),
  relationships: Joi.object({
    holdings: HoldingsRelationship.optional().description(
      'CPHs with a current holdership at this location'
    )
  }).required()
})
