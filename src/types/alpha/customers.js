import Joi from 'joi'

import { baseData, relationshipToMany, relationshipToOne } from './helpers.js'

// const ContactDetails = Joi.object({
//   fullName: Joi.string().allow(null).label('Full name'),
//   emailAddress: Joi.string().allow(null).label('Email address'),
//   phoneNumber: Joi.string().allow(null).label('Phone number')
// }).required()
//
// const BusinessContactDetails = Joi.object({
//   primary: ContactDetails,
//   secondary: ContactDetails
// })

export const CustomerRelationship = relationshipToOne({
  plural: 'customers',
  singular: 'customer'
})

export const CustomersData = baseData({
  plural: 'customers',
  singular: 'customer'
})

export const CustomersRelationships = Joi.object({
  srabpiPlant: relationshipToMany({
    singular: 'srabpi-plant',
    plural: 'srabpi-plants'
  })
}).required()

// export const BusinessCustomersData = CustomersData.keys({
//   subType: Joi.string().required().valid('ORGANISATION'),
//   organisationName: Joi.string().required().label('Organisation Name'),
//   address: Address,
//   contactDetails: BusinessContactDetails,
//   relationships: CustomersRelationships
// })

// const IndividualContactDetails = Joi.object({
//   type: Joi.string().valid('MOBILE', 'LANDLINE', 'EMAIL').required(),
//   number: Joi.string().optional(),
//   address: Joi.string().optional(),
//   isPreferred: Joi.boolean()
// })

// export const IndividualCustomersData = CustomersData.keys({
//   subType: Joi.string().required().valid('PERSON'),
//   title: Joi.string().required(),
//   firstName: Joi.string().required(),
//   middleName: Joi.string().optional(),
//   lastName: Joi.string().required(),
//   addresses: Joi.array()
//     .items(Address.keys({ isPreferred: Joi.boolean() }))
//     .required(),
//   contactDetails: Joi.array().items(IndividualContactDetails),
//   relationships: CustomersRelationships
// })
//
export const Customers = CustomersData
