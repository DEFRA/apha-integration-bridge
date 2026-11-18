import { z } from 'zod'

/**
 * Shape the model must return. Kept inside the memo-extraction module: nothing
 * outside it sees Zod or the raw model output. Deliberately has no length or
 * count constraints: native structured output doesn't support all of them, so
 * those limits are enforced in validate.js instead.
 */

export const ROLES = /** @type {const} */ ([
  'contact',
  'agent',
  'keeper',
  'owner',
  'previous_contact',
  'apha_staff',
  'vet',
  'other'
])

export const MODEL_STATUSES = /** @type {const} */ ([
  'found',
  'none',
  'ambiguous'
])

export const MODEL_REASON_CODES = /** @type {const} */ ([
  'SINGLE_PERSON',
  'MULTIPLE_PEOPLE',
  'NO_PERSON_NAMED',
  'ONLY_NON_PERSON_NAMES',
  'UNCLEAR_IF_PERSON',
  'CONFLICTING_INFORMATION'
])

export const ModelOutputSchema = z.object({
  status: z
    .enum(MODEL_STATUSES)
    .describe('found, none or ambiguous, as defined in the instructions'),
  reasonCode: z
    .enum(MODEL_REASON_CODES)
    .describe(
      'Reason code matching the status, as defined in the instructions'
    ),
  persons: z
    .array(
      z.object({
        name: z
          .string()
          .describe('The name exactly as written in the memo, never corrected'),
        role: z
          .enum(ROLES)
          .nullable()
          .describe(
            'Role from the instructions, or null when the memo gives no clue'
          )
      })
    )
    .describe('Every person named in the memo; empty when status is none')
})

/**
 * @typedef {z.infer<typeof ModelOutputSchema>} ModelOutput
 */
