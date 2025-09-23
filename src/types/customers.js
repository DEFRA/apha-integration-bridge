import Joi from 'joi'

import { LinksReference } from './links.js'

export const CustomersData = Joi.object({
  type: Joi.string()
    .valid('customers')
    .required()
    .label('Customer Type')
    .description('The “type” value will be "customers" for this endpoint.'),
  id: Joi.string().required().label('Customer ID')
})

export const CustomersReference = Joi.object({
  data: CustomersData.required(),
  links: LinksReference
})
