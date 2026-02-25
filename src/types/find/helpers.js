import Joi from 'joi'

/**
 * @typedef {{ plural: string, singular: string }} EntityTerms
 */

/**
 * @param {string} s
 */
const capitalise = (s) => s[0].toUpperCase() + s.slice(1)

/**
 * @param {EntityTerms} entityTerms
 * @returns {Joi.ObjectSchema}
 */
export const baseData = ({ plural, singular }) =>
  Joi.object({
    type: Joi.string()
      .valid(plural)
      .required()
      .label(`${capitalise(singular)} type`),
    id: Joi.string()
      .required()
      .label(`${capitalise(singular)} ID`)
  }).label(`${capitalise(singular)}`)

/**
 * @param {Joi.Schema} entityDataSchema
 * @returns {Joi.ObjectSchema}
 */
export const relationshipToOne = (entityDataSchema) =>
  Joi.object({
    data: entityDataSchema.required().allow(null)
  })

/**
 * @param {Joi.Schema} entityDataSchema
 * @returns {Joi.ObjectSchema}
 */
export const relationshipToMany = (entityDataSchema) =>
  Joi.object({
    data: Joi.array().items(entityDataSchema).required()
  })
