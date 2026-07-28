import Joi from 'joi'

// Sam's response wire format, used by routes for swagger docs only (the
// client passes bodies through verbatim, and response validation is off).
// The alpha mock keeps its own copies on purpose — its contract shouldn't
// be coupled to the live client.

export const SamResponseSchema = Joi.object({
  code: Joi.string()
    .required()
    .description("Standardised response code 'sam-api-success'"),
  uid: Joi.string()
    .required()
    .description('Unique identifier associated with the response'),
  message: Joi.string()
    .required()
    .description('Detailed description of the success of the request')
})
  .description('A success response from the Sam standardwork API')
  .label('Sam Response')

export const SamErrorSchema = Joi.object({
  code: Joi.string()
    .required()
    .description("Standardised response code 'sam-api-error-' plus cause"),
  message: Joi.string().required().description('Detail of the error'),
  uid: Joi.string()
    .required()
    .description('Unique identifier associated with the response'),
  field_errors: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required().description('Standardised error code'),
        message: Joi.string()
          .required()
          .description('Human-readable error message')
      }).label('Sam Field Error')
    )
    .description('Field validation errors')
})
  .description('An error response from the Sam standardwork API')
  .label('Sam Error')
