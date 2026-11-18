/**
 * SPIKE (DSFAAP-2993): extract contact names from a SAM AH_MEMO free-text
 * field. See README.md in this folder.
 *
 * Public API of the memo-extraction module. Callers get our own result shape
 * and never see Strands, the provider or the raw model output.
 */
import { mask } from '../pii/index.js'
import {
  MemoModelError,
  createStrandsModel,
  getMemoExtractionConfig,
  isModelConfigured
} from './model.js'
import { PROMPT_VERSION } from './prompt.js'
import { SCHEMA_VERSION } from './schema.js'
import { POLICY_VERSION, validateModelOutput } from './validate.js'

/**
 * Which prompt, output schema and decision policy produced a result. With the
 * model id, enough to reproduce or explain any answer.
 */
export const VERSIONS = Object.freeze({
  promptVersion: PROMPT_VERSION,
  schemaVersion: SCHEMA_VERSION,
  policyVersion: POLICY_VERSION
})

/**
 * @typedef {'found' | 'none' | 'ambiguous' | 'unavailable'} MemoContactsStatus
 * @typedef {{
 *   modelId: string,
 *   promptVersion: string,
 *   schemaVersion: string,
 *   policyVersion: string
 * }} MemoContactsMeta
 * @typedef {{
 *   status: MemoContactsStatus,
 *   reasonCode: string,
 *   contacts: import('./validate.js').Contact[],
 *   meta: MemoContactsMeta
 * }} MemoContacts
 * @typedef {{
 *   latencyMs: number,
 *   usage: import('./model.js').TokenUsage | null,
 *   droppedNames: number
 * }} MemoExtractionDiagnostics
 *   Safe to log: counts and timings only, never memo text or names.
 */

/**
 * @param {string | null | undefined} memo
 * @param {{
 *   model?: import('./model.js').MemoModel,
 *   cfg?: import('./model.js').MemoExtractionConfig
 * }} [options] `model` and `cfg` are for tests and the scoring script
 * @returns {Promise<{ memoContacts: MemoContacts, diagnostics: MemoExtractionDiagnostics }>}
 *   Never rejects: every failure becomes status "unavailable" with a reason
 *   code, so a caller can always fall back to a manual SAM check.
 */
export const extractMemoContacts = async (memo, options = {}) => {
  const cfg = options.cfg ?? getMemoExtractionConfig()
  /** @type {MemoContactsMeta} */
  const meta = { modelId: cfg.modelId, ...VERSIONS }
  const started = performance.now()

  /** @type {MemoExtractionDiagnostics} */
  const diagnostics = {
    latencyMs: 0,
    usage: null,
    droppedNames: 0
  }

  /**
   * @param {MemoContactsStatus} status
   * @param {string} reasonCode
   * @param {import('./validate.js').Contact[]} [contacts]
   */
  const finish = (status, reasonCode, contacts = []) => {
    diagnostics.latencyMs = Math.round(performance.now() - started)

    return {
      memoContacts: {
        status,
        reasonCode,
        contacts: contacts.map((contact) => ({
          ...contact,
          name: /** @type {string} */ (mask(contact.name))
        })),
        meta
      },
      diagnostics
    }
  }

  const text = (memo ?? '').trim()

  if (text === '') {
    return finish('none', 'EMPTY_MEMO')
  }

  if (text.length > cfg.maxMemoChars) {
    return finish('unavailable', 'MEMO_TOO_LONG')
  }

  const model =
    options.model ?? (isModelConfigured(cfg) ? createStrandsModel(cfg) : null)

  if (!model) {
    return finish('unavailable', 'NOT_CONFIGURED')
  }

  try {
    const { output, usage } = await model.extract(text, {
      signal: AbortSignal.timeout(cfg.timeoutMs)
    })

    diagnostics.usage = usage

    const validated = validateModelOutput(output, text)

    diagnostics.droppedNames = validated.droppedNames

    return finish(validated.status, validated.reasonCode, validated.contacts)
  } catch (error) {
    return finish(
      'unavailable',
      error instanceof MemoModelError ? error.code : 'MODEL_ERROR'
    )
  }
}
