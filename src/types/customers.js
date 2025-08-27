import Joi from 'joi'

import { LinksReference } from './links.js'

export const CustomersReference = Joi.object({
  data: Joi.object({
    type: Joi.string()
      .valid('customers')
      .required()
      .label('Customer Type')
      .description('The “type” value will be "customers" for this endpoint.'),
    id: Joi.string().required().label('Customer ID')
  }).required(),
  links: LinksReference
})
