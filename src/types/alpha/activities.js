import Joi from 'joi'
import { baseData } from './helpers.js'

export const Activities = baseData({
  singular: 'activity',
  plural: 'activities'
}).keys({
  activityName: Joi.string()
    .required()
    .description('The activity to be performed'),
  default: Joi.boolean()
    .required()
    .description(
      'Whether this activity is the default for this workorder type'
    ),
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
