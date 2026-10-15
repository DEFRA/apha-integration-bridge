import Joi from 'joi'

import { baseData, relationshipToMany, relationshipToOne } from './helpers.js'
import { StructuredAddress } from './address.js'

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

export const SrabpiPlantsData = baseData({
  singular: 'srabpi-plant',
  plural: 'srabpi-plants'
}).meta({ response: { type: 'srabpi-plants' } })

export const CustomersRelationships = Joi.object({
  srabpiPlants: relationshipToMany(SrabpiPlantsData)
}).required()

const PreferredContact = Joi.object({
  isPreferred: Joi.boolean().required(),
  usageType: Joi.string()
    .allow(null)
    .description(
      'Proposed. SAM address-usage type: HOME, CORRESPONDENCE or PLACEOFBUSINESS; `null` for most entries'
    )
})

const EmailAddress = PreferredContact.keys({
  type: Joi.string().valid('email').required(),
  emailAddress: Joi.string().required()
})

const PhoneNumber = PreferredContact.keys({
  type: Joi.string().valid('mobile', 'landline').required(),
  phoneNumber: Joi.string().required()
})

const FaxNumber = PreferredContact.keys({
  type: Joi.string().valid('fax').required(),
  faxNumber: Joi.string().required()
})

export const CustomerContactDetails = Joi.alternatives(
  EmailAddress,
  PhoneNumber,
  FaxNumber
)

export const Role = Joi.object({
  mainRoleType: Joi.string()
    .valid(
      'CUSTOMER',
      'SUPPLIER',
      'EMPLOYEE',
      'DEFRAORGROLE',
      'INTERESTEDPARTY'
    )
    .required()
    .description("SAM's high-level role class"),
  roleType: Joi.string()
    .required()
    .description(
      'SAM role type, for example CPHHOLDER, LIVESTOCKKEEPER or LANDOWNER'
    ),
  roleName: Joi.string()
    .required()
    .allow(null)
    .description("SAM's label for `roleType`, for example `CPH Holder`"),
  from: Joi.string().required().description('Start of the role')
})
  .description('A current role the party holds in SAM')
  .label('Role')

export const Customer = CustomersData.keys({
  partyType: Joi.string()
    .valid('PERSON')
    .description('Proposed. Always PERSON on this endpoint'),
  title: Joi.string().required(),
  firstName: Joi.string().required(),
  middleName: Joi.string().required().allow(null),
  lastName: Joi.string().required(),
  roles: Joi.array().items(Role).description('Proposed'),
  addresses: Joi.array().items(
    StructuredAddress.keys({ isPreferred: Joi.boolean() })
  ),
  contactDetails: Joi.array().items(CustomerContactDetails),
  relationships: CustomersRelationships
})
