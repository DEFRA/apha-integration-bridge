import Joi from 'joi'

export const ActivitiesData = Joi.object({
  type: Joi.string()
    .valid('activities')
    .required()
    .label('Activity Type')
    .description('The “type” value will be "activities" for this endpoint.'),
  /**
   * an activity ID is optional, as it may be referenced by a composite identifier
   */
  id: Joi.string().label('Activity ID')
})

export const ActivitiesReference = Joi.object({
  data: ActivitiesData.allow(null).required()
})
