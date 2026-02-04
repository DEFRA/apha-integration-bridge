import Joi from 'joi'

import { baseData, relationshipToMany } from './helpers.js'
import { Address } from './locations.js'

const ContactDetails = Joi.object({
  fullName: Joi.string().allow(null).label('Full name'),
  emailAddress: Joi.string().allow(null).label('Email address'),
  phoneNumber: Joi.string().allow(null).label('Phone number')
}).required()

const OrganisationContactDetails = Joi.object({
  primaryContact: ContactDetails,
  secondaryContact: ContactDetails
})

export const OrganisationData = baseData({
  plural: 'organisations',
  singular: 'organisation'
})

export const OrganisationRelationships = Joi.object({
  srabpiPlants: relationshipToMany({
    singular: 'srabpi-plant',
    plural: 'srabpi-plants'
  })
}).required()

export const Organisation = OrganisationData.keys({
  organisationName: Joi.string().required().label('Organisation Name'),
  address: Address.required(),
  contactDetails: OrganisationContactDetails,
  relationships: OrganisationRelationships
})
