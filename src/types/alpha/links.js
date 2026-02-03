import Joi from 'joi'

export const SelfLink = Joi.object({
  self: Joi.string().required().description('Link to this resource')
}).label('Links')

export const PaginatedLink = SelfLink.keys({
  prev: Joi.string().required().allow(null).description('Link to next page'),
  next: Joi.string().required().allow(null).description('Link to previous page')
}).label('Paginated links')
