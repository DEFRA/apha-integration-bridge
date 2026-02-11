import Joi from 'joi'

import { LinksReference } from './links.js'

const CaseManagementUserData = Joi.object({
  type: Joi.string()
    .valid('case-management-user')
    .required()
    .label('Case Management User Type')
    .description(
      'The "type" value will be "case-management-user" for this endpoint.'
    ),
  id: Joi.string().required().label('User ID')
}).meta({ response: { type: 'case-management-user' } })

export const CaseManagementUserReference = Joi.object({
  data: CaseManagementUserData.required(),
  links: LinksReference
})

export const CaseManagementUser = CaseManagementUserData
