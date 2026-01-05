import Joi from 'joi'

import { LinksReference } from './links.js'

const OptionalString = Joi.string().allow(null, '')
const OptionalNumber = Joi.number().allow(null)

const AddressData = Joi.object({
  paonStartNumber: OptionalNumber,
  paonStartNumberSuffix: OptionalString,
  paonEndNumber: OptionalNumber,
  paonEndNumberSuffix: OptionalString,
  paonDescription: OptionalString,
  saonDescription: OptionalString,
  saonStartNumber: OptionalNumber,
  saonStartNumberSuffix: OptionalString,
  saonEndNumber: OptionalNumber,
  saonEndNumberSuffix: OptionalString,
  street: OptionalString,
  locality: OptionalString,
  town: OptionalString,
  administrativeAreaCounty: OptionalString,
  postcode: OptionalString,
  countryCode: OptionalString
})

const ContactDetails = Joi.object({
  fullName: Joi.string().allow(null, '').label('Full name')
})

const BusinessContactDetails = Joi.object({
  primary: ContactDetails,
  secondary: ContactDetails
})

export const BusinessCustomersData = Joi.object({
  type: Joi.string()
    .valid('customers')
    .required()
    .label('Customer Type')
    .description('The “type” value will be "customers" for this endpoint.'),
  id: Joi.string().required().label('Customer ID'),
  subType: Joi.string().required().valid('ORGANISATION'),
  businessName: Joi.string().required().label('Business Name'),
  address: AddressData,
  contactDetails: BusinessContactDetails
})

export const CustomersData = Joi.alternatives(BusinessCustomersData)

export const CustomersReference = Joi.object({
  data: CustomersData.required(),
  links: LinksReference
})
