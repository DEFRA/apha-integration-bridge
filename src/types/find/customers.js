import Joi from 'joi'

import { baseData, relationshipToMany, relationshipToOne } from './helpers.js'
import { Address } from '../address.js'
import { AssociationRole, ContactMethods, Role } from '../party-details.js'

export const CustomerRelationship = relationshipToOne(
  baseData({
    plural: 'customers',
    singular: 'customer'
  })
)

export const CustomersData = baseData({
  plural: 'customers',
  singular: 'customer'
}).meta({ response: { type: 'customers' } })

export const CustomersRelationships = Joi.object({
  srabpiPlants: relationshipToMany(
    baseData({
      singular: 'srabpi-plant',
      plural: 'srabpi-plants'
    })
  ),
  organisations: relationshipToMany(
    baseData({
      singular: 'organisation',
      plural: 'organisations'
    })
  ).description(
    'Organisations the customer is currently related to in SAM, for example as an employee or business partner. Each id can be looked up with POST /organisations/find'
  )
}).required()

export const CphAssociation = Joi.object({
  cph: Joi.string().required().description('For example 12/345/6789'),
  role: AssociationRole.required(),
  involvementTypes: Joi.array()
    .items(
      Joi.string().valid(
        'CPHHOLDERSHIP',
        'OWNEROFLOCATION',
        'PRIMARYKEEPEROF',
        'SECONDARYKEEPEROF',
        'OWNEROF'
      )
    )
    .required()
    .description('SAM involvement types behind the association'),
  locationIds: Joi.array().items(Joi.string()).required(),
  livestockUnitIds: Joi.array().items(Joi.string()).required()
}).label('CPH association')

export const Customer = CustomersData.keys({
  partyType: Joi.string()
    .valid('PERSON')
    .required()
    .description('SAM party type. This endpoint returns persons only'),
  title: Joi.string().required(),
  firstName: Joi.string().required().allow(null),
  middleName: Joi.string().required().allow(null),
  lastName: Joi.string().required(),
  addresses: Joi.array().items(Address.keys({ isPreferred: Joi.boolean() })),
  contactDetails: Joi.array()
    .items(ContactMethods)
    .description(
      'Every current e-mail, mobile, landline and fax entry, held directly or through a current role, once per SAM usage type'
    ),
  roles: Joi.array()
    .items(Role)
    .required()
    .description('Every current SAM role the customer holds'),
  cphAssociations: Joi.array()
    .items(CphAssociation)
    .description(
      'Current CPH associations, one per CPH and role. Only returned when the search finds a single customer'
    ),
  relationships: CustomersRelationships
})
