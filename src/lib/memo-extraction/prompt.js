import { loadSQL } from '../db/utils/load-sql.js'

/**
 * Bump on any change to prompt.md or the model output schema, so every result
 * (and every scoring run) records which prompt produced it.
 */
export const PROMPT_VERSION = '1.0.0'

export const SYSTEM_PROMPT = loadSQL(import.meta.filename, '.md')

/**
 * Wraps the memo in delimiters so the model treats it as data, not
 * instructions. Closing tags inside the memo are neutralised so it can't end
 * the block early.
 *
 * @param {string} memo
 */
export const buildUserMessage = (memo) =>
  `Extract the people named in this memo.\n\n<memo>${memo.replaceAll('</memo>', '</ memo>')}</memo>`
