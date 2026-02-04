import Joi from 'joi'

export const PaginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .required()
    .description('The page number to retrieve'),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(10)
    .description('The number of items per page')
})
