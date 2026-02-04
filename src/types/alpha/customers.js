import Joi from 'joi'

import { baseData, relationshipToMany, relationshipToOne } from './helpers.js'
import { Address } from './locations.js'

export const CustomerRelationship = relationshipToOne({
  plural: 'customers',
  singular: 'customer'
})

export const CustomersData = baseData({
  plural: 'customers',
  singular: 'customer'
})

export const CustomersRelationships = Joi.object({
  srabpiPlants: relationshipToMany({
    singular: 'srabpi-plant',
    plural: 'srabpi-plants'
  })
}).required()

const PreferredContact = Joi.object({
  isPreferred: Joi.boolean().required()
})

const EmailAddress = PreferredContact.keys({
  type: Joi.string().valid('email').required(),
  emailAddress: Joi.string().required()
})

const PhoneNumber = PreferredContact.keys({
  type: Joi.string().valid('mobile', 'landline').required(),
  phoneNumber: Joi.string().required()
})

const CustomerContactDetails = Joi.alternatives(EmailAddress, PhoneNumber)

export const Customer = CustomersData.keys({
  title: Joi.string().required(),
  firstName: Joi.string().required(),
  middleName: Joi.string().required().allow(null),
  lastName: Joi.string().required(),
  addresses: Joi.array().items(Address.keys({ isPreferred: Joi.boolean() })),
  contactDetails: Joi.array().items(CustomerContactDetails),
  relationships: CustomersRelationships
})
