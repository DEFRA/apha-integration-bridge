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
  sequenceNumber: Joi.number()
    .required()
    .description(
      'The sequence in which this activity is expected to be performed'
    )
})
