import Joi from 'joi'

/**
 * @param {Joi.Schema} referenceSchema
 */
export const oneToManyRelationshipSchema = (referenceSchema) =>
  Joi.array().items(referenceSchema)
