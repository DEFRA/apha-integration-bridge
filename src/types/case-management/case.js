import Joi from 'joi'

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
 * @typedef {Object} CaseDetailsPayload
 * @property {string} Status
 * @property {string} Priority
 * @property {string} APHA_Application__c
 * @property {string} ContactId
 */

/**
 * @typedef {Object} UpdateCaseDetailsPayload
 * @property {string} [Status]
 * @property {string} [Priority]
 * @property {string} [APHA_Application__c]
 * @property {string} [ContactId]
 */

/**
 * @typedef { 'text'|'number'|'address'|'file'|'checkbox'|'date'|'email'|'name'} KeyFactType
 */

/**
 * @typedef {Object} KeyFactItem
 * @property {KeyFactType} type
 * @property {string|number|string[]|Address|Name} value
 */

const KeyFactItemSchema = Joi.object({
  type: Joi.string()
    .valid(
      'text',
      'number',
      'address',
      'file',
      'checkbox',
      'date',
      'email',
      'name'
    )
    .required(),
  value: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.number(),
      Joi.array().items(Joi.string()),
      AddressSchema,
      NameSchema
    )
    .required()
})

/**
 * @typedef {Object} TextKeyFactItem
 * @property {'text'} type
 * @property {string} value
 */

const TextKeyFactItemSchema = KeyFactItemSchema.keys({
  type: Joi.string().valid('text').required(),
  value: Joi.string().required()
})

const AllowEmptyTextKeyFactItemSchema = TextKeyFactItemSchema.keys({
  value: Joi.string().required().allow('')
})

/**
 * @typedef {Object} NumberKeyFactItem
 * @property {'number'} type
 * @property {number} value
 */

const NumberKeyFactItemSchema = KeyFactItemSchema.keys({
  type: Joi.string().valid('number').required(),
  value: Joi.number().required()
})

/**
 * @typedef {Object} AddressKeyFactItem
 * @property {'address'} type
 * @property {Address} value
 */

const AddressKeyFactItemSchema = KeyFactItemSchema.keys({
  type: Joi.string().valid('address').required(),
  value: AddressSchema.required()
})

/**
 * @typedef {Object} NameKeyFactItem
 * @property {'name'} type
 * @property {Name} value
 */

const NameKeyFactItemSchema = KeyFactItemSchema.keys({
  type: Joi.string().valid('name').required(),
  value: NameSchema.required()
})

/**
 * @typedef {Object} RequesterKeyFactItem
 * @property {'text'} type
 * @property {'origin'|'destination'} value
 */

const RequesterKeyFactItemSchema = TextKeyFactItemSchema.keys({
  type: Joi.string().valid('text').required(),
  value: Joi.string().valid('origin', 'destination').required()
})

/**
 * @typedef {Object} MovementDirectionKeyFactItem
 * @property {'text'} type
 * @property {'on'|'off'} value
 */

const MovementDirectionKeyFactItemSchema = TextKeyFactItemSchema.keys({
  type: Joi.string().valid('text').required(),
  value: Joi.string().valid('on', 'off').required()
})

/**
 * @typedef {Object} FileKeyFactItem
 * @property {'file'} type
 * @property {string} value
 */

/**
 * @typedef {Object} FileArrayKeyFactItem
 * @property {'file'} type
 * @property {string[]} value
 */

const FileArrayKeyFactItemSchema = KeyFactItemSchema.keys({
  type: Joi.string().valid('file').required(),
  value: Joi.array().items(Joi.string()).required()
})

/**
 * @typedef {Object} KeyFacts
 * @property {KeyFactItem} licenceType
 * @property {RequesterKeyFactItem} requester
 * @property {MovementDirectionKeyFactItem} [movementDirection]
 * @property {TextKeyFactItem} [additionalInformation]
 * @property {NumberKeyFactItem} [numberOfCattle]
 * @property {TextKeyFactItem} [originCph]
 * @property {AddressKeyFactItem} [originAddress]
 * @property {NameKeyFactItem} [originKeeperName]
 * @property {TextKeyFactItem} [destinationCph]
 * @property {AddressKeyFactItem} [destinationAddress]
 * @property {NameKeyFactItem} [destinationKeeperName]
 * @property {TextKeyFactItem} [requesterCph]
 * @property {FileArrayKeyFactItem} [biosecurityMaps]
 */

const KeyFactsSchema = Joi.object({
  licenceType: TextKeyFactItemSchema.required(),
  requester: RequesterKeyFactItemSchema.required(),
  movementDirection: MovementDirectionKeyFactItemSchema.optional(),
  additionalInformation: AllowEmptyTextKeyFactItemSchema.optional(),
  numberOfCattle: NumberKeyFactItemSchema.optional(),
  originCph: TextKeyFactItemSchema.optional(),
  originAddress: AddressKeyFactItemSchema.optional(),
  originKeeperName: NameKeyFactItemSchema.optional(),
  destinationCph: TextKeyFactItemSchema.optional(),
  destinationAddress: AddressKeyFactItemSchema.optional(),
  destinationKeeperName: NameKeyFactItemSchema.optional(),
  requesterCph: TextKeyFactItemSchema.optional(),
  biosecurityMaps: FileArrayKeyFactItemSchema.optional()
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
  displayText: Joi.string().required().allow('')
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

export const GetCaseParamsSchema = Joi.object({
  caseId: Joi.string().required().label('Case ID')
})

export const CaseData = Joi.object({
  type: Joi.string()
    .valid('case')
    .required()
    .label('Case Type')
    .description('The "type" value will be "case" for this endpoint.'),
  id: Joi.string().required().label('Case ID')
}).meta({ response: { type: 'case' } })

export const Case = CaseData.keys({
  attributes: Joi.object({
    caseNumber: Joi.string().allow(null),
    status: Joi.string().allow(null),
    priority: Joi.string().allow(null),
    contactId: Joi.string().allow(null),
    createdDate: Joi.string().allow(null),
    lastModifiedDate: Joi.string().allow(null)
  }).required()
})

export const GetCaseResponseSchema = Joi.object({
  data: Case.required(),
  links: Joi.object()
})
  .description('Case Details')
  .label('Get Case Response')

/**
 * @typedef {Object} KeyFactRecordItem
 * @property {Object} attributes
 * @property {string} attributes.type
 * @property {string} [attributes.referenceId]
 * @property {string} APHA_Key__c
 * @property {string} APHA_Value__c
 * @property {string} APHA_Entity_Type__c
 * @property {string} APHA_Status__c
 * @property {string} APHA_Application__c
 */

/**
 * @typedef {Object} KeyFactRequest
 * @property {boolean} allOrNone
 * @property {KeyFactRecordItem[]} records
 */
