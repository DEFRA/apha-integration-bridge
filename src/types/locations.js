import Joi from 'joi'

import { LinksReference } from './links.js'

export const LocationsReference = Joi.object({
  data: Joi.object({
    type: Joi.string()
      .valid('locations')
      .required()
      .label('Location Type')
      .description('The “type” value will be "locations" for this endpoint.'),
    id: Joi.string().required().label('Location ID')
  }).required(),
  links: LinksReference
})
