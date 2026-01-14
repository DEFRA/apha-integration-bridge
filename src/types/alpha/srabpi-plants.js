import Joi from 'joi'
import { LinksReference } from '../links.js'

export const SrabpiPlantData = Joi.object({
  type: Joi.string().valid('srabpi-plants').required().label('SRABPI Plant'),
  id: Joi.string().required().label('SRABPI Plant Id')
})

export const SrabpiPlantReference = Joi.object({
  data: SrabpiPlantData.required(),
  links: LinksReference
})
