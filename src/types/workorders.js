import Joi from 'joi'

export const WorkorderIdSchema = Joi.string()
  .trim()
  .pattern(/^WS-\d+$/i)
  .min(1)
  .required()
