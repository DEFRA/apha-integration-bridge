import Joi from 'joi'

import { LinksReference } from './links.js'

export const FacilitiesData = Joi.object({
  type: Joi.string()
    .valid('facilities')
    .required()
    .label('Facility Type')
    .description('The “type” value will be "facilities" for this endpoint.'),
  id: Joi.string().required().label('Facility ID')
})

export const FacilitiesReference = Joi.object({
  data: FacilitiesData.required(),
  links: LinksReference
})
