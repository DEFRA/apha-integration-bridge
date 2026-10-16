import Joi from 'joi'

import { baseData, relationshipToMany } from './helpers.js'
import { StructuredAddress } from './address.js'
import { CustomerContactDetails, Role } from './customers.js'

const ContactDetails = Joi.object({
  fullName: Joi.string().allow(null).label('Full name'),
  emailAddress: Joi.string().allow(null).label('Email address'),
  phoneNumber: Joi.string().allow(null).label('Phone number')
}).required()

export const OrganisationContactDetails = Joi.object({
  primaryContact: ContactDetails.label('Primary contact'),
  secondaryContact: ContactDetails.label('Secondary contact')
})

export const OrganisationData = baseData({
  plural: 'organisations',
  singular: 'organisation'
})

export const OrganisationRelationships = Joi.object({
  srabpiPlants: relationshipToMany(
    baseData({
      singular: 'srabpi-plant',
      plural: 'srabpi-plants'
    })
  )
}).required()

export const Organisation = OrganisationData.keys({
  organisationName: Joi.string().required().label('Organisation Name'),
  organisationType: Joi.string()
    .allow(null)
    .description(
      "Proposed. SAM organisation type code. AHORGUNIT marks one of Defra's own organisational units; most organisations are NOTKNOWN"
    ),
  roles: Joi.array().items(Role).description('Proposed'),
  address: StructuredAddress.required(),
  contactDetails: OrganisationContactDetails,
  contactMethods: Joi.array()
    .items(CustomerContactDetails)
    .description(
      'Proposed. Every current e-mail, phone and fax entry, in the shape of a customer contact detail'
    ),
  relationships: OrganisationRelationships
})
