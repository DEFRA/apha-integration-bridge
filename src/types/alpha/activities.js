import Joi from 'joi'
import { baseData } from './helpers.js'

export const Activities = baseData({
  singular: 'activity',
  plural: 'activities'
})
  .keys({
    activityName: Joi.string()
      .required()
      .description('The activity to be performed'),
    default: Joi.boolean()
      .required()
      .description(
        'Whether this activity is the default for this workorder type'
      )
  })
