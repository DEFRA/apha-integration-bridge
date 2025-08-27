import Joi from 'joi'

import { LinksReference } from './links.js'

const HoldingsData = Joi.object({
  type: Joi.string()
    .valid('holdings')
    .required()
    .label('Holding Type')
    .description('The “type” value will be "holdings" for this endpoint.'),
  id: Joi.string().required().label('CPH ID')
})

export const HoldingsReference = Joi.object({
  data: HoldingsData.required(),
  links: LinksReference
})

export const Holdings = HoldingsReference.keys({
  data: HoldingsData.keys({
    cphType: Joi.string().required().label('CPH Type')
  }).required()
}).label('Holdings Data')
