import Joi from 'joi'

import { LinksReference } from './links.js'

export const CommoditiesData = Joi.object({
  type: Joi.string()
    .valid('commodities')
    .required()
    .label('Commodity Type')
    .description('The “type” value will be "commodities" for this endpoint.'),
  id: Joi.string().required().label('Commodity ID')
})

export const CommoditiesReference = Joi.object({
  data: CommoditiesData.required(),
  links: LinksReference
})
