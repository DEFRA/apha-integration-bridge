import Joi from 'joi'

import { LinksReference } from '../links.js'

const CompositeResponseItemSchema = Joi.object({
  body: Joi.object()
    .unknown(true)
    .required()
    .description('Response body from the sub-request'),
  httpHeaders: Joi.object()
    .unknown(true)
    .default({})
    .description('HTTP headers from the sub-request response'),
  httpStatusCode: Joi.number()
    .integer()
    .min(100)
    .max(599)
    .required()
    .description('HTTP status code from the sub-request'),
  referenceId: Joi.string()
    .required()
    .description('Reference ID matching the original request')
})
  .description('Individual composite response item')
  .label('Composite Response Item')

const CaseData = Joi.object({
  id: Joi.string().required().label('Case reference'),
  type: Joi.string()
    .valid('case-management-case')
    .required()
    .label('Case Management Case Creation')
    .description(
      'The "type" value will be "case-management-case" for this endpoint.'
    ),
  compositeResponse: Joi.array()
    .items(CompositeResponseItemSchema)
    .required()
    .description('Array of responses from composite sub-requests')
})
  .description('Salesforce composite response')
  .label('Case Composite Response')

export const CaseReference = Joi.object({
  data: CaseData.required(),
  links: LinksReference
})

/**
 * @typedef {Object} Name
 * @property {string} firstName
 * @property {string} lastName
 */

const NameSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required()
})

/**
 * @typedef {Object} Address
 * @property {string} addressLine1
 * @property {string} [addressLine2]
 * @property {string} addressTown
 * @property {string} [addressCounty]
 * @property {string} addressPostcode
 */

const AddressSchema = Joi.object({
  addressLine1: Joi.string().required(),
  addressLine2: Joi.string().optional(),
  addressTown: Joi.string().required(),
  addressCounty: Joi.string().optional(),
  addressPostcode: Joi.string().required()
})

/**
 * @typedef {Object} GuestCustomerDetails
 * @property {'guest'} type
 * @property {string} emailAddress
 * @property {Name} name
 */

const GuestCustomerDetailsSchema = Joi.object({
  type: Joi.string().valid('guest').required(),
  emailAddress: Joi.string().email().required(),
  name: NameSchema.required()
})

/**
 * @typedef {Object} KeyFacts
 * @property {string} licenceType
 * @property {'origin'|'destination'} requester
 * @property {number} [numberOfCattle]
 * @property {string} [originCph]
 * @property {Address} [originAddress]
 * @property {Name} [originKeeperName]
 * @property {string} [destinationCph]
 * @property {Address} [destinationAddress]
 * @property {Name} [destinationKeeperName]
 * @property {string} [requesterCph]
 * @property {string} [additionalInfomation]
 * @property {string[]} [biosecurityMaps]
 */

const KeyFactsSchema = Joi.object({
  licenceType: Joi.string().required(),
  requester: Joi.string().valid('origin', 'destination').required(),
  movementDirection: Joi.string().valid('on', 'off').optional(),
  additionalInformation: Joi.string().allow('').optional(),
  numberOfCattle: Joi.number().integer().optional(),
  originCph: Joi.string().optional(),
  originAddress: AddressSchema.optional(),
  originKeeperName: NameSchema.optional(),
  destinationCph: Joi.string().optional(),
  destinationAddress: AddressSchema.optional(),
  destinationKeeperName: NameSchema.optional(),
  requesterCph: Joi.string().optional(),
  additionalInfomation: Joi.string().allow('').optional(),
  biosecurityMaps: Joi.array().items(Joi.string()).optional()
})

/**
 * @typedef {Object} Version
 * @property {number} major
 * @property {number} minor
 */

const VersionSchema = Joi.object({
  major: Joi.number().integer().required(),
  minor: Joi.number().integer().required()
})

/**
 * @typedef {Object} Answer
 * @property {string} type
 * @property {any} value
 * @property {string} displayText
 */

const AnswerSchema = Joi.object({
  type: Joi.string().required(),
  value: Joi.any().required(),
  displayText: Joi.string().required()
})

/**
 * @typedef {Object} QuestionAnswer
 * @property {string} question
 * @property {string} questionKey
 * @property {Answer} answer
 */

const QuestionAnswerSchema = Joi.object({
  question: Joi.string().required(),
  questionKey: Joi.string().required(),
  answer: AnswerSchema.required()
})

/**
 * @typedef {Object} Section
 * @property {string} sectionKey
 * @property {string} title
 * @property {QuestionAnswer[]} questionAnswers
 */

const SectionSchema = Joi.object({
  sectionKey: Joi.string().required(),
  title: Joi.string().required(),
  questionAnswers: Joi.array().items(QuestionAnswerSchema).required()
})

/**
 * @typedef {Object} CreateCasePayload
 * @property {string} journeyId
 * @property {Version} journeyVersion
 * @property {string} applicationReferenceNumber
 * @property {Section[]} sections
 * @property {KeyFacts} keyFacts
 * @property {GuestCustomerDetails} applicant
 */

export const CreateCasePayloadSchema = Joi.object({
  journeyId: Joi.string().required(),
  journeyVersion: VersionSchema.required(),
  applicationReferenceNumber: Joi.string().required(),
  sections: Joi.array().items(SectionSchema).required(),
  keyFacts: KeyFactsSchema.required(),
  applicant: GuestCustomerDetailsSchema.required()
})
  .description('Case creation API request payload')
  .label('Create Case Request')

export const PostCreateCaseResponseSchema = Joi.object({
  data: Joi.array().items(CaseData).required(),
  links: LinksReference
})
  .description('Case Management Case Details')
  .label('Create Case Response')

export const Case = CaseData
