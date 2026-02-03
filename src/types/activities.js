import Joi from 'joi'

const ActivityId = Joi.string().label('Activity ID')
const ActivityType = Joi.string()
  .valid('activities')
  .required()
  .label('Activity Type')
  .description('The “type” value will be "activities" for this endpoint.')

export const Activities = Joi.object({
  type: ActivityType,
  id: ActivityId,
  activityName: Joi.string().required(),
  default: Joi.boolean().required()
}).label('Activity')
