import Joi from 'joi'

/**
 * @param {Joi.Schema} referenceSchema
 */
export const oneToManyRelationshipSchema = (referenceSchema) =>
  Joi.alternatives(Joi.array().items(referenceSchema), referenceSchema)
