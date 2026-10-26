import Joi from 'joi'

import { baseData, relationshipToMany } from './helpers.js'
import { Address } from '../address.js'
import { ContactMethods, Role } from '../party-details.js'

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
}).meta({ response: { type: 'organisations' } })

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
    .required()
    .allow(null)
    .description(
      "SAM organisation type code: AHORGUNIT marks one of Defra's own organisational units; most organisations are NOTKNOWN"
    ),
  address: Address.required(),
  contactDetails: OrganisationContactDetails,
  contactMethods: Joi.array()
    .items(ContactMethods)
    .required()
    .description(
      'Every current e-mail, mobile, landline and fax entry of the organisation, held directly or through a current role, once per SAM usage type. Same item shape as `contactDetails` on `POST /customers/find`'
    ),
  roles: Joi.array()
    .items(Role)
    .required()
    .description('Every current SAM role the organisation holds'),
  relationships: OrganisationRelationships
})
