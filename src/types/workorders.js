import Joi from 'joi'

import { LinksReference } from './links.js'
import { CustomersReference } from './customers.js'
import { HoldingsReference } from './holdings.js'
import { LocationsReference } from './locations.js'
import { CommoditiesReference } from './commodities.js'
import { Activities } from './activities.js'
import { FacilitiesReference } from './facilities.js'

const WorkordersData = Joi.object({
  type: Joi.string()
    .valid('workorders')
    .required()
    .label('Workorder Type')
    .description('The “type” value will be "workorders" for this endpoint.'),
  id: Joi.string().required().label('Workorder ID')
})

export const WorkordersReference = Joi.object({
  data: WorkordersData.required(),
  links: LinksReference
})

export const Workorders = WorkordersData.keys({
  status: Joi.string().required().label('Status'),
  startDate: Joi.string().required().label('Start Date'),
  activationDate: Joi.string().required().label('Activation Date'),
  earliestStartDate: Joi.string().required().label('Earliest Start Date'),
  purpose: Joi.string().label('Purpose'),
  workArea: Joi.string().label('Work Area'),
  country: Joi.string().label('Country'),
  businessArea: Joi.string().label('Business Area'),
  aim: Joi.string().label('Aim'),
  latestActivityCompletionDate: Joi.string().label(
    'Latest Activity Completion Date'
  ),
  phase: Joi.string().label('Phase'),
  activities: Joi.array().items(Activities).required().label('Activities'),
  relationships: Joi.object({
    customer: CustomersReference.optional(),
    holding: HoldingsReference.optional(),
    location: LocationsReference.optional(),
    commodity: CommoditiesReference.optional(),
    facilities: FacilitiesReference.optional()
  })
})
