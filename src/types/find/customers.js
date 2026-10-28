import Joi from 'joi'

import { baseData, relationshipToMany, relationshipToOne } from './helpers.js'
import { Address } from '../address.js'
import { ContactMethods, Role } from '../party-details.js'

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
  )
}).required()

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
  relationships: CustomersRelationships
})
