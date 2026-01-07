import Joi from 'joi'

import { Commodities, CommoditiesData } from './commodities.js'
import { FacilitiesData } from './facilities.js'
import { LinksReference } from './links.js'

export const LocationsData = Joi.object({
  type: Joi.string()
    .valid('locations')
    .required()
    .label('Location Type')
    .description('The “type” value will be "locations" for this endpoint.'),
  id: Joi.string().required().label('Location ID')
})

export const LocationsReference = Joi.object({
  data: LocationsData.required(),
  links: LinksReference
})

export const Address = Joi.object({
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
  address: Address.required(),
  osMapReference: Joi.string().allow(null, '').label('OS map reference'),
  relationships: Joi.object({
    commodities: Joi.object({
      data: Joi.alternatives(
        CommoditiesData,
        Joi.array().items(CommoditiesData)
      ).required(),
      links: LinksReference
    }),
    facilities: Joi.object({
      data: Joi.alternatives(
        FacilitiesData,
        Joi.array().items(FacilitiesData)
      ).required(),
      links: LinksReference
    })
  })
})

export const LocationsHydrated = Locations.keys({
  livestockUnits: Joi.array().items(Commodities).required(),
  facilities: Joi.array().items(FacilitiesData).required()
})
