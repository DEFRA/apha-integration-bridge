import Joi from 'joi'

import { CommoditiesData } from './commodities.js'
import { FacilitiesData } from './facilities.js'
import { HoldingsData } from './find/holdings.js'
import { FeatureStatus, Position, SubLocation } from './find/locations.js'

export const LocationIdSchema = Joi.string()
  .pattern(/^L\d+$/)
  .required()

export const LocationsData = Joi.object({
  type: Joi.string()
    .valid('locations')
    .required()
    .label('Location Type')
    .description('The “type” value will be "locations" for this endpoint.'),
  id: Joi.string().required().label('Location ID')
}).meta({ response: { type: 'locations' } })

export const LocationsReference = Joi.object({
  data: LocationsData.allow(null).required()
})

const Address = Joi.object({
  paonStartNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  paonStartNumberSuffix: Joi.string().allow(null, ''),
  paonEndNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  paonEndNumberSuffix: Joi.string().allow(null, ''),
  paonDescription: Joi.string().allow(null, ''),
  saonDescription: Joi.string().allow(null, ''),
  saonStartNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  saonStartNumberSuffix: Joi.string().allow(null, ''),
  saonEndNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  saonEndNumberSuffix: Joi.string().allow(null, ''),
  street: Joi.string().allow(null, ''),
  locality: Joi.string().allow(null, ''),
  town: Joi.string().allow(null, ''),
  administrativeAreaCounty: Joi.string().allow(null, ''), // maps ADMINISTRATIVE_AREA
  postcode: Joi.string().allow(null, ''),
  ukInternalCode: Joi.string().allow(null, ''),
  countryCode: Joi.string().allow(null, '')
}).required()

export const Locations = LocationsData.keys({
  name: Joi.string().allow(null).required().label('Location name'),
  status: FeatureStatus.required(),
  address: Address.required(),
  position: Position.required(),
  subLocations: Joi.array()
    .items(SubLocation)
    .required()
    .description('Buildings, fields and sheds of the premises'),
  relationships: Joi.object({
    commodities: Joi.object({
      data: Joi.array().items(CommoditiesData).required()
    }),
    facilities: Joi.object({
      data: Joi.array().items(FacilitiesData).required()
    }),
    holdings: Joi.object({
      // its own label: `POST /locations/find`'s holdings items are `Holding`
      data: Joi.array()
        .items(HoldingsData.label('Holding reference'))
        .required()
        .label('Holding references')
    })
      .description('CPHs with a current holdership at this location')
      .label('Location holdings')
  })
})
