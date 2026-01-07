import Joi from 'joi'

import { LinksReference } from './links.js'
import { SrabpiPlantReference } from './srabpi-plants.js'
import { Address } from './locations.js'

const ContactDetails = Joi.object({
  fullName: Joi.string().allow(null, '').label('Full name'),
  emailAddress: Joi.string().allow(null, '').label('Email address'),
  phoneNumber: Joi.string().allow(null, '').label('Phone number')
})

const BusinessContactDetails = Joi.object({
  primary: ContactDetails,
  secondary: ContactDetails
})

export const CustomersData = Joi.object({
  type: Joi.string()
    .valid('customers')
    .required()
    .label('Customer Type')
    .description('The “type” value will be "customers" for this endpoint.'),
  id: Joi.string().required().label('Customer ID')
})

export const CustomersRelationships = Joi.object({
  srabpiPlant: SrabpiPlantReference.optional()
})

export const BusinessCustomersData = CustomersData.keys({
  subType: Joi.string().required().valid('ORGANISATION'),
  businessName: Joi.string().required().label('Business Name'),
  address: Address,
  contactDetails: BusinessContactDetails,
  relationships: CustomersRelationships
})

const IndividualContactDetails = Joi.object({
  type: Joi.string().valid('MOBILE', 'LANDLINE', 'EMAIL').required(),
  number: Joi.string().optional(),
  address: Joi.string().optional(),
  isPreferred: Joi.boolean()
})

export const IndividualCustomersData = CustomersData.keys({
  subType: Joi.string().required().valid('PERSON'),
  title: Joi.string().required(),
  firstName: Joi.string().required(),
  middleName: Joi.string().optional(),
  lastName: Joi.string().required(),
  addresses: Joi.array()
    .items(Address.keys({ isPreferred: Joi.boolean() }))
    .required(),
  contactDetails: Joi.array().items(IndividualContactDetails),
  relationships: CustomersRelationships
})

export const Customers = Joi.alternatives(
  BusinessCustomersData,
  IndividualCustomersData
)

export const CustomersReference = Joi.object({
  data: CustomersData.required(),
  links: LinksReference
})
