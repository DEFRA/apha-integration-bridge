import Joi from 'joi'

/**
 * @param {string} s
 */
const capitalise = (s) => s[0].toUpperCase() + s.slice(1)

/**
 * @param {{ plural: string, singular: string }} entityTerms
 * @returns {Joi.Schema}
 */
export const relationshipSchema = ({ plural, singular }) =>
  Joi.object({
    data: Joi.object({
      type: Joi.string()
        .valid(plural)
        .required()
        .label(`${capitalise(singular)} type`),
      id: Joi.string()
        .required()
        .label(`${capitalise(singular)} ID`)
    })
      .required()
      .allow(null)
  })
