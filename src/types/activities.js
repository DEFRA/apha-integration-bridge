import Joi from 'joi'

import { LinksReference } from './links.js'

export const ActivitiesReference = Joi.object({
  data: Joi.object({
    type: Joi.string()
      .valid('activities')
      .required()
      .label('Activity Type')
      .description('The “type” value will be "activities" for this endpoint.'),
    /**
     * an activity ID is optional, as it may be referenced by a composite identifier
     */
    id: Joi.string().label('Activity ID')
  }).required(),
  links: LinksReference
})
