import Joi from 'joi'

/**
 * @typedef {{
 *   next?: string
 *   prev?: string
 * }} LinksReference
 */

export const LinksReferenceSchema = Joi.object({
  next: Joi.string().optional().label('Next Link'),
  prev: Joi.string().optional().label('Previous Link')
}).or('next', 'prev')

/**
 * @typedef {{
 *   self: string
 *   next?: string
 *   prev?: string
 * }} TopLevelLinksReference
 */

export const TopLevelLinksReferenceSchema = Joi.object({
  self: Joi.string().required().label('Self Link'),
  next: Joi.string().optional().label('Next Link'),
  prev: Joi.string().optional().label('Previous Link')
})
  .label('Links')
  .required()
