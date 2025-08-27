import Joi from 'joi'

export const LinksReference = Joi.object({
  self: Joi.string().required().label('Self Link'),
  next: Joi.string().optional().label('Next Link'),
  prev: Joi.string().optional().label('Previous Link')
})
