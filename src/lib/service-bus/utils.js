/**
 * Minimal view of a Service Bus message used by parsing helpers.
 *
 * @typedef {{ body: unknown }} ServiceBusMessageLike
 */
import { CustomerEventSchema } from '../../routes/customer-registration/events.post.js'
import { ValidationError } from './errors.js'

/**
 * Extract the EntityPath from a connection string.
 *
 * @param {string} connectionString
 * @returns {string | null}
 */
export function resolveEntityPath(connectionString) {
  const match = connectionString?.match(/EntityPath=([^;]+)/i)

  return match?.[1] || null
}

/**
 * Parse the Service Bus message body into an object.
 *
 * @param {ServiceBusMessageLike} message
 * @returns {object}
 * @throws {ValidationError}
 */
export function parseMessageBody(message) {
  const { body } = message

  if (body === undefined || body === null) {
    throw new ValidationError('Message body is empty')
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch (error) {
      throw new ValidationError('Message body must be JSON')
    }
  }

  if (body instanceof Uint8Array) {
    const text = Buffer.from(body).toString('utf8')

    try {
      return JSON.parse(text)
    } catch (error) {
      throw new ValidationError('Message body must be JSON')
    }
  }

  if (typeof body === 'object') {
    // Leave objects untouched; downstream validation expects original shape/metadata
    return body
  }

  throw new ValidationError(`Unsupported message body type: ${typeof body}`)
}

/**
 * Validate a parsed customer event against the Joi schema.
 *
 * @param {object} payload
 * @returns {object}
 * @throws {ValidationError}
 */
export function validateCustomerEvent(payload) {
  const { value, error } = CustomerEventSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: true
  })

  if (error) {
    const details = error.details?.map((d) => d.message).join('; ') || ''

    throw new ValidationError(
      `Customer event validation failed${details ? `: ${details}` : ''}`
    )
  }

  return value
}
