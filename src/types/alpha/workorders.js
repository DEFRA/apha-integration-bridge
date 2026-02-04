import Joi from 'joi'

import { CustomerRelationship } from './customers.js'
import { HoldingsRelationship } from './holdings.js'
import { baseData, relationshipToMany } from './helpers.js'
import { Activities } from './activities.js'

const WorkordersData = baseData({
  plural: 'workorders',
  singular: 'workorder'
})

export const Workorders = WorkordersData.keys({
  // status: Joi.string().required().label('Status').description('Status of the work order - e.g. Open'),
  activationDate: Joi.string().required().label('Activation Date'),
  businessArea: Joi.string()
    .required()
    .label('Business Area')
    .description(
      'The broad business area this workorder relates to - e.g. Disease Risk Reduction'
    ),
  workArea: Joi.string()
    .required()
    .label('Work Area')
    .description(
      'The specific area this workorder relates to - e.g. Sheep Scab / TB'
    ),
  country: Joi.string().required().label('Country'),
  aim: Joi.string()
    .required()
    .label('Aim')
    .description(
      'The broad outcome this workorder contributes to - e.g. Contain / Control / Eradicate Endemic Disease'
    ),
  purpose: Joi.string()
    .required()
    .label('Purpose')
    .description(
      'The activity to be undertaken during the workorder - e.g. Sheep & Goat on Farm Survey'
    ),
  earliestActivityStartDate: Joi.string()
    .required()
    .label('Start Date')
    .description('The start date of the earliest activity'),
  species: Joi.string().required().label('Species'),
  activities: Joi.array().items(Activities).required().label('Activities'),
  // latestActivityCompletionDate: Joi.string().label(
  //   'Latest Activity Completion Date'
  // ),
  phase: Joi.string().required().label('Phase'),
  relationships: Joi.object({
    customer: CustomerRelationship.description(
      'The individual or organisation that has the contact for the workorder'
    ),
    holding: HoldingsRelationship.description(
      'Holding on which the workorder takes place'
    ),
    facilities: relationshipToMany({
      plural: 'facilities',
      singular: 'facility'
    }).description('Facilities involved in the workorder'),
    locations: relationshipToMany({
      plural: 'locations',
      singular: 'location'
    }).description('Locations involved during the workorder'),
    commodities: relationshipToMany({
      plural: 'commodities',
      singular: 'comodities'
    }).description('Commodities to be inspected during the workorder')
  }).required()
})
