import Joi from 'joi'

export const LinksReference = Joi.object({
  next: Joi.string().optional().label('Next Link'),
  prev: Joi.string().optional().label('Previous Link')
}).or('next', 'prev')

export const TopLevelLinksReference = Joi.object({
  self: Joi.string().required().label('Self Link'),
  next: Joi.string().optional().label('Next Link'),
  prev: Joi.string().optional().label('Previous Link')
})
  .label('Links')
  .required()
