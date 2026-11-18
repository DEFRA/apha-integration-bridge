/**
 * SPIKE (DSFAAP-2993): the non-AI baselines the scoring script compares the
 * models against. Each is wrapped as a MemoModel, so it runs through the same
 * extractMemoContacts pipeline (validation, masking) and is scored exactly
 * like a model.
 */
import { findNamesByNer } from './ner.js'
import { findNamesByRules } from './rules.js'

/** @type {Record<string, (memo: string) => Array<{ name: string, role: string | null }>>} */
const BASELINES = {
  'baseline:rules': findNamesByRules,
  'baseline:ner': findNamesByNer
}

/**
 * @param {string} id
 */
export const isBaseline = (id) => id in BASELINES

/**
 * @param {string} id one of the BASELINES keys
 * @returns {import('../../model.js').MemoModel}
 */
export const createBaselineModel = (id) => {
  const find = BASELINES[id]

  return {
    async extract(memo) {
      const persons =
        /** @type {import('../../schema.js').ModelOutput['persons']} */ (
          find(memo)
        )

      return {
        output:
          persons.length === 0
            ? { status: 'none', reasonCode: 'NO_PERSON_NAMED', persons }
            : {
                status: 'found',
                reasonCode:
                  persons.length === 1 ? 'SINGLE_PERSON' : 'MULTIPLE_PEOPLE',
                persons
              },
        usage: null
      }
    }
  }
}
