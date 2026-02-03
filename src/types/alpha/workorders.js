import Joi from 'joi'

import { ActivitiesReference } from '../activities.js'
import { CustomerRelationship } from './customers.js'
import { HoldingsRelationship } from './holdings.js'
import { LocationsRelationship } from './locations.js'

const WorkordersData = Joi.object({
  type: Joi.string()
    .valid('workorders')
    .required()
    .label('Workorder Type')
    .description('The “type” value will be "workorders" for this endpoint.'),
  id: Joi.string().required().label('Workorder ID')
})

export const Workorders = WorkordersData.keys({
  status: Joi.string().required().label('Status'),
  startDate: Joi.string().required().label('Start Date'),
  activationDate: Joi.string().required().label('Activation Date'),
  purpose: Joi.string().label('Purpose'),
  workArea: Joi.string().label('Work Area'),
  country: Joi.string().label('Country'),
  businessArea: Joi.string().label('Business Area'),
  aim: Joi.string().label('Aim'),
  latestActivityCompletionDate: Joi.string().label(
    'Latest Activity Completion Date'
  ),
  phase: Joi.string().label('Phase'),
  relationships: Joi.object({
    customer: CustomerRelationship,
    holding: HoldingsRelationship,
    // facility: FacilitiesReference.optional(),
    location: LocationsRelationship,
    // commodity: CommoditiesReference.optional(),
    activities: ActivitiesReference.optional()
  })
})
