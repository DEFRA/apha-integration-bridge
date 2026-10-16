import Joi from 'joi'
import { baseData, relationshipToOne } from './helpers.js'
import { Locations, LocationsRelationship } from './locations.js'
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
  cphType: Joi.string()
    .valid('permanent', 'temporary', 'emergency')
    .required()
    .label('CPH Type'),
  localAuthority: Joi.string().required().label('Local Authority'),
  status: Joi.string().required().valid('active', 'inactive'),
  relationships: Joi.object({
    location: LocationsRelationship,
    cphHolder: CustomerRelationship.description('The owner of the holding')
  }).required()
}).label('Holdings Data')

export const Holdership = Joi.object({
  vetnetCoreId: Joi.string()
    .required()
    .description(
      "SAM's Vetnet core id. With the CPH number it identifies the holdership"
    ),
  from: Joi.string().required().description('Start of the holdership'),
  cphType: Joi.string()
    .valid('PERMANENT', 'TEMPORARY', 'EMERGENCY')
    .required()
    .description(
      "The holdership's CPH type, the value `GET /holdings/{cph}` returns as `cphType`"
    ),
  selected: Joi.boolean()
    .required()
    .description(
      'True on one holdership per CPH: latest `from`, then highest SAM key'
    )
}).label('Holdership')

/**
 * An item of `/holdings/{countyId}/{parishId}/{holdingId}/locations`: the
 * location as `POST /locations/find` returns it, plus the holdership that
 * links it to the CPH.
 */
export const HoldingLocation = Locations.keys({
  holdership: Holdership.required()
}).label('Holding location')

const SupplierInvolvement = Joi.object({
  involvementType: Joi.string().valid('OVFOR', 'DPFOR').required(),
  locationId: Joi.string().required(),
  livestockUnitId: Joi.string().required(),
  from: Joi.string().required().allow(null)
}).label('Supplier involvement')

/**
 * An item of `/holdings/{countyId}/{parishId}/{holdingId}/suppliers`: the
 * supplier search item plus one involvement per livestock unit and type.
 */
export const HoldingSupplier = baseData({
  plural: 'suppliers',
  singular: 'supplier'
})
  .keys({
    supplierTypes: Joi.array().items(Joi.string()).min(1).required(),
    partyType: Joi.string()
      .valid('PERSON', 'ORGANISATION')
      .required()
      .allow(null),
    title: Joi.string().required().allow(null),
    firstName: Joi.string().required().allow(null),
    lastName: Joi.string().required().allow(null),
    organisationName: Joi.string().required().allow(null),
    involvements: Joi.array().items(SupplierInvolvement).min(1).required()
  })
  .label('Holding supplier')
