/**
 * SPIKE (DSFAAP-2993): a conventional named-entity recogniser as a non-AI
 * baseline for scoring, as the AICE advice asks. The only module that imports
 * `compromise` (a dev dependency): only the scoring script and its tests use
 * it, never the service.
 */
import nlp from 'compromise'

/**
 * The people `compromise` recognises in the memo, as written, in order. It
 * gives no roles.
 *
 * @param {string} memo
 * @returns {Array<{ name: string, role: null }>}
 */
export const findNamesByNer = (memo) => {
  /** @type {string[]} */
  const people = nlp(memo).people().out('array')

  return [
    ...new Set(
      people
        // compromise keeps punctuation that follows a name ("Smith," or
        // "Smith."). A name never ends in an initial, so a final full stop
        // goes too.
        .map((text) => text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').trim())
        .filter((text) => text !== '')
    )
  ].map((name) => ({ name, role: null }))
}
