import Joi from 'joi'

/**
 * @param {string} s
 */
const capitalise = (s) => s[0].toUpperCase() + s.slice(1)

/**
 * @param {{ plural: string, singular: string }} entityTerms
 * @returns {Joi.Schema}
 */
const baseDataSchema = ({ plural, singular }) =>
  Joi.object({
    type: Joi.string()
      .valid(plural)
      .required()
      .label(`${capitalise(singular)} type`),
    id: Joi.string()
      .required()
      .label(`${capitalise(singular)} ID`)
  })

/**
 * @param {{ plural: string, singular: string }} entityTerms
 * @returns {Joi.Schema}
 */
export const relationshipToOne = (entityTerms) =>
  Joi.object({
    data: baseDataSchema(entityTerms).required().allow(null)
  })

export const relationshipToMany = (entityTerms) =>
  Joi.object({
    data: Joi.array().items(baseDataSchema(entityTerms)).required()
  })
