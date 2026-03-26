import Joi from 'joi'
import { baseData, relationshipToOne, relationshipToMany } from './helpers.js'
import { Activities } from './activities.js'
import { HoldingsRelationship } from './holdings.js'

/**
 * @import { RelationshipToMany, RelationshipToOne } from './helpers.js'
 */

/**
 * @typedef {{
 *  type: 'workorders'
 *  id: string
 *  activationDate: string
 *  targetDate: string
 *  businessArea: string
 *  workArea: string
 *  country: string
 *  aim: string
 *  purpose: string
 *  earliestActivityStartDate: string
 *  species: string
 *  activities: object[]
 *  phase: string
 *  relationships: {
 *    customerOrOrganisation: RelationshipToOne
 *    holding: RelationshipToOne
 *    facilities: RelationshipToMany
 *    location: RelationshipToOne
 *    livestockUnits: RelationshipToMany
 *    }
 * }} Workorders
 */

/**
 * @typedef {{
 * workAreaMapping: {
 *   work_area_code: string,
 *   work_area_desc: string
 * }[],
 * speciesMapping: {
 *   purpose_species_code: string,
 *   purpose_species_desc: string
 * }[]
 * }} WorkorderMappings
 */

const WorkordersData = baseData({
  plural: 'workorders',
  singular: 'workorder'
}).meta({ response: { type: 'workorders' } })

const CustomerOrOrganisationRelationship = Joi.object({
  data: Joi.object({
    type: Joi.string()
      .valid('customers', 'organisations')
      .required()
      .label('CustomerOrOrganisation type'),
    id: Joi.string().required().label('CustomerOrOrganisation ID')
  })
    .required()
    .allow(null)
})

export const WorkordersSchema = WorkordersData.keys({
  type: Joi.string().valid('workorders').required().label('Type'),
  id: Joi.string().required().label('workorder'),
  activationDate: Joi.string().required().allow(null).label('Activation Date'),
  targetDate: Joi.string().required().allow(null).label('Target Date'),
  businessArea: Joi.string()
    .required()
    .allow(null)
    .label('Business Area')
    .description(
      'The broad business area this workorder relates to - e.g. Disease Risk Reduction'
    ),
  workArea: Joi.string()
    .required()
    .allow(null)
    .label('Work Area')
    .description(
      'The specific area this workorder relates to - e.g. Sheep Scab / TB'
    ),
  country: Joi.string().required().allow(null).label('Country'),
  aim: Joi.string()
    .required()
    .allow(null)
    .label('Aim')
    .description(
      'The broad outcome this workorder contributes to - e.g. Contain / Control / Eradicate Endemic Disease'
    ),
  purpose: Joi.string()
    .required()
    .allow(null)
    .label('Purpose')
    .description(
      'The activity to be undertaken during the workorder - e.g. Sheep & Goat on Farm Survey'
    ),
  earliestActivityStartDate: Joi.string()
    .required()
    .allow(null)
    .label('Start Date')
    .description('The start date of the earliest activity'),
  species: Joi.string().required().allow(null).label('Species'),
  activities: Joi.array().items(Activities).required().label('Activities'),
  phase: Joi.string().required().allow(null).label('Phase'),
  relationships: Joi.object({
    customerOrOrganisation: CustomerOrOrganisationRelationship.description(
      'The individual or organisation that has the contact for the workorder'
    ),
    holding: HoldingsRelationship.description(
      'Holding on which the workorder takes place'
    ),
    facilities: relationshipToMany(
      baseData({
        plural: 'facilities',
        singular: 'facility'
      })
    ).description('Facilities involved in the workorder'),
    location: relationshipToOne(
      baseData({
        plural: 'locations',
        singular: 'location'
      })
    ).description('Locations involved during the workorder'),
    livestockUnits: relationshipToMany(
      baseData({
        plural: 'animal-commodities',
        singular: 'animal-commodity'
      })
    ).description('Livestock units to be inspected during the workorder')
  }).required()
})

export const GetCodeMappingSchema = Joi.array()
  .items(Joi.string().required())
  .min(1)
  .required()
