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
 * @param {EntityTerms} entityTerms
 * @returns {Joi.ObjectSchema}
 */
export const relationshipToOne = (entityTerms) =>
  Joi.object({
    data: baseData(entityTerms).required().allow(null)
  }).label(`${capitalise(entityTerms.singular)} relationship`)

/**
 * @param {EntityTerms} entityTerms
 * @returns {Joi.ObjectSchema}
 */
export const relationshipToMany = (entityTerms) =>
  Joi.object({
    data: Joi.array()
      .items(baseData(entityTerms))
      .required()
      .label(`${capitalise(entityTerms.plural)}`)
  }).label(`${capitalise(entityTerms.plural)} relationship`)
