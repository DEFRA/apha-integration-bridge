import Joi from 'joi'

import { PaginationSchema } from './pagination.js'

export const PaginateWorkordersSchema = PaginationSchema.keys({
  startActivationDate: Joi.string()
    .isoDate()
    .required()
    .description('Paginate workorders after or on this start activation date'),
  endActivationDate: Joi.string()
    .isoDate()
    .required()
    .description('Paginate workorders before this end activation date')
})
