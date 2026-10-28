import Joi from 'joi'

const ContactMethod = Joi.object({
  isPreferred: Joi.boolean().required(),
  usageType: Joi.string()
    .required()
    .allow(null)
    .description(
      'SAM address-usage type, for example HOME, CORRESPONDENCE or PLACEOFBUSINESS'
    )
})

export const ContactMethods = Joi.alternatives(
  ContactMethod.keys({
    type: Joi.string().valid('email').required(),
    emailAddress: Joi.string().required()
  }),
  ContactMethod.keys({
    type: Joi.string().valid('mobile', 'landline').required(),
    phoneNumber: Joi.string().required()
  }),
  ContactMethod.keys({
    type: Joi.string().valid('fax').required(),
    faxNumber: Joi.string().required()
  })
).label('Contact method')

export const Role = Joi.object({
  mainRoleType: Joi.string()
    .required()
    .description("SAM's high-level role class, for example CUSTOMER"),
  roleType: Joi.string()
    .required()
    .description('SAM role type, for example CPHHOLDER or LIVESTOCKKEEPER'),
  roleName: Joi.string()
    .required()
    .allow(null)
    .description("SAM's label for `roleType`, for example `CPH Holder`"),
  from: Joi.string().required().allow(null).description('Start of the role')
})
  .description('A current role the party holds in SAM')
  .label('Role')
