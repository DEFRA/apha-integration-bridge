import Joi from 'joi'

/**
 * @typedef {{
 *   self: string
 * }} SelfLink
 */

export const SelfLinkSchema = Joi.object({
  self: Joi.string().required().description('Link to this resource')
})
  .label('Links')
  .required()

/**
 * @typedef {{
 *   self: string
 *   prev: string | null
 *   next: string | null
 * }} PaginatedLink
 */

export const PaginatedLinkSchema = SelfLinkSchema.keys({
  prev: Joi.string().required().allow(null).description('Link to next page'),
  next: Joi.string().required().allow(null).description('Link to previous page')
})
  .label('Paginated links')
  .required()
