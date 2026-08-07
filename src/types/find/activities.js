import Joi from 'joi'
import { baseData } from './helpers.js'

export const Activities = baseData({
  singular: 'activity',
  plural: 'activities'
}).keys({
  id: Joi.string().label('Activity ID'),
  activityName: Joi.string()
    .required()
    .allow(null)
    .description('The activity to be performed'),
  status: Joi.string()
    .required()
    .allow(null)
    .description('The status of the activity'),
  sequenceNumber: Joi.number()
    .required()
    .allow(null)
    .description(
      'The sequence in which this activity is expected to be performed'
    ),
  performActivity: Joi.boolean()
    .required()
    .description('Whether this activity is required to be performed'),
  workbasket: Joi.string()
    .allow(null)
    .description('The workbasket that this activity relates to'),
  assignedTo: Joi.string()
    .allow(null)
    .description('The operator assigned to this activity'),
  externalReference: Joi.string()
    .required()
    .allow(null)
    .description(
      "The external reference for an activity allocated to an external supplier: the assigned operator's id, or the marker 'External' where the work is routed via a Delivery Partner, whose identity is then given by deliveryPartnerIdentifier. Null when the activity is not externally allocated"
    ),
  supplierIdentifier: Joi.string()
    .required()
    .allow(null)
    .description(
      'The identifier of the third-party organisation the activity is allocated to. Null when the activity is not externally allocated'
    ),
  deliveryPartnerIdentifier: Joi.string()
    .required()
    .allow(null)
    .description(
      'The identifier of the Delivery Partner assigned to this activity (England and Wales). Null when no Delivery Partner is assigned'
    )
})
