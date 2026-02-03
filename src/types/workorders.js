import Joi from 'joi'

import { LinksReference } from './links.js'
import { CustomersReference } from './alpha/customers.js'
import { HoldingsReference } from './holdings.js'
import { LocationsReference } from './locations.js'
import { CommoditiesReference } from './commodities.js'
import { Activities } from './activities.js'
import { FacilitiesReference } from './facilities.js'
import { oneToManyRelationshipSchema } from './helpers.js'

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
  startDate: Joi.string().isoDate().required().label('Start Date'),
  activationDate: Joi.string().isoDate().required().label('Activation Date'),
  earliestStartDate: Joi.string()
    .isoDate()
    .required()
    .label('Earliest Start Date'),
  purpose: Joi.string().label('Purpose').allow(null),
  workArea: Joi.string().label('Work Area').allow(null),
  country: Joi.string().label('Country').allow(null),
  businessArea: Joi.string().label('Business Area').allow(null),
  aim: Joi.string().label('Aim').allow(null),
  species: Joi.string()
    .allow(null)
    .label('Species')
    .description(
      'The species (or species list) that this workorder relates to'
    ),
  phase: Joi.string().label('Phase').allow(null),
  activities: Joi.array().items(Activities).required().label('Activities'),
  latestActivityCompletionDate: Joi.string()
    .isoDate()
    .label('Latest Activity Completion Date')
    .allow(null),
  relationships: Joi.object({
    customer: CustomersReference.allow(null),
    holding: HoldingsReference.allow(null),
    locations: oneToManyRelationshipSchema(LocationsReference).label(
      'Locations references'
    ),
    commodities: oneToManyRelationshipSchema(CommoditiesReference).label(
      'Commodities references'
    ),
    facilities: oneToManyRelationshipSchema(FacilitiesReference).label(
      'Facilities references'
    )
  }).label('Relationships')
}).label('Workorder')
