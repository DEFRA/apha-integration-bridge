import { readFileSync } from 'node:fs'
import Joi from 'joi'
import { parse, printParseErrorCode } from 'jsonc-parser'

/**
 * @typedef {Object} ClientEntry
 * @property {string[]} client_ids
 * @property {string[]} scopes
 *
 * @typedef {Record<string, ClientEntry>} ClientsConfig
 */

const entrySchema = Joi.object({
  client_ids: Joi.array().items(Joi.string().min(1)).required(),
  scopes: Joi.array().items(Joi.string().min(1)).required()
}).required()

const clientsSchema = Joi.object()
  .pattern(Joi.string().min(1), entrySchema)
  .required()

/**
 * @param {string} filePath
 */
const loadFile = (filePath) => {
  try {
    return readFileSync(filePath, 'utf8')
  } catch (err) {
    let reason = String(err)

    if (err instanceof Error) {
      reason = err.message
    }

    throw new Error(`Failed to read clients config at ${filePath}: ${reason}`)
  }
}

/**
 * @param {string} raw
 * @param {string} filePath
 */
const parseClients = (raw, filePath) => {
  /** @type {import('jsonc-parser').ParseError[]} */
  const errors = []

  const parsed = parse(raw, errors, { allowTrailingComma: true })

  if (errors.length > 0) {
    const reason = errors
      .map((e) => `${printParseErrorCode(e.error)} at offset ${e.offset}`)
      .join(', ')

    throw new Error(`Failed to parse clients config at ${filePath}: ${reason}`)
  }

  return parsed
}

/**
 * Reads and validates the clients config file. Accepts JSONC syntax (comments
 * and trailing commas) so the team can annotate entries inline. Throws on
 * missing file, invalid JSONC, or schema mismatch — callers are expected to
 * surface these at boot time so misconfiguration fails fast rather than
 * silently masking everything.
 *
 * @param {string} filePath
 * @returns {ClientsConfig}
 */
export const loadClients = (filePath) => {
  const file = loadFile(filePath)

  const parsed = parseClients(file, filePath)

  // `$schema` is a tooling hint for editor validation; it is not part of the
  // runtime config and would be rejected by the entry pattern below.
  if (parsed && typeof parsed === 'object' && '$schema' in parsed) {
    delete parsed.$schema
  }

  const { error, value } = clientsSchema.validate(parsed, { abortEarly: false })

  if (error) {
    throw new Error(`Invalid clients config at ${filePath}: ${error.message}`)
  }

  return value
}
