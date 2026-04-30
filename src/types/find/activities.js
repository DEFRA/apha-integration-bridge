import Joi from 'joi'
import { baseData } from './helpers.js'

export const Activities = baseData({
  singular: 'activity',
  plural: 'activities'
}).keys({
  id: Joi.string().label('Activity ID'),
  activityName: Joi.string()
    .required()
    .description('The activity to be performed'),
  status: Joi.string()
    .required()
    .allow(null)
    .description('The status of the activity'),
  sequenceNumber: Joi.number()
    .required()
    .description(
      'The sequence in which this activity is expected to be performed'
    ),
  performActivity: Joi.boolean()
    .required()
    .description('Whether this activity is required to be performed'),
  workbasket: Joi.string()
    .allow(null)
    .description('The workbasket that this activity relates to')
})
