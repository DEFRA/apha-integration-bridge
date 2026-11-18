/**
 * Deterministic checks on the model's output. This is where "how reliable is
 * the match" comes from: not the model's own opinion, but whether each name
 * can be found in the memo and whether the output is self-consistent.
 */

/**
 * Bump on any change to the rules in this file (how names are matched, when
 * an answer becomes ambiguous), so every result records which decision policy
 * produced its status.
 */
export const POLICY_VERSION = '1.0.0'

export const MAX_CONTACTS = 10

/**
 * Folds the differences that don't change a name: case, curly vs straight
 * apostrophes, dash variants, punctuation (full stops after initials, commas,
 * brackets) and runs of whitespace. Letters, digits, apostrophes and hyphens
 * are kept, so O'Neill and Jones-Parry still have to match as written.
 *
 * @param {string} value
 */
export const normaliseName = (value) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[‐-―]/g, '-')
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .trim()

const WORD_CHAR = /[\p{L}\p{N}]/u

/**
 * Whether `needle` occurs in `haystack` as whole words, not inside a longer
 * word ("Ann" must not match "Joanna").
 *
 * @param {string} haystack
 * @param {string} needle
 */
const containsWholeWords = (haystack, needle) => {
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  ) {
    const before = haystack[at - 1] ?? ' '
    const after = haystack[at + needle.length] ?? ' '

    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) {
      return true
    }
  }

  return false
}

/**
 * Whether `name` appears in `memo`, and how closely.
 *
 * @param {string} name
 * @param {string} memo
 * @returns {'exact' | 'normalised' | null}
 */
export const findInMemo = (name, memo) => {
  if (name.trim() === '') {
    return null
  }

  if (containsWholeWords(memo, name)) {
    return 'exact'
  }

  return ` ${normaliseName(memo)} `.includes(` ${normaliseName(name)} `)
    ? 'normalised'
    : null
}

/**
 * @typedef {'found' | 'none' | 'ambiguous'} ValidatedStatus
 * @typedef {{ name: string, role: string | null, sourceMatch: 'exact' | 'normalised' }} Contact
 * @typedef {{ status: ValidatedStatus, reasonCode: string, contacts: Contact[], droppedNames: number }} ValidatedResult
 */

/**
 * @param {import('./schema.js').ModelOutput} output
 * @param {string} memo
 * @returns {ValidatedResult}
 */
export const validateModelOutput = (output, memo) => {
  /** @type {Contact[]} */
  const contacts = []
  const seen = new Set()
  let droppedNames = 0

  for (const person of output.persons) {
    const sourceMatch = findInMemo(person.name, memo)

    if (!sourceMatch) {
      droppedNames++
      continue
    }

    const key = normaliseName(person.name)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    contacts.push({ name: person.name, role: person.role, sourceMatch })
  }

  /**
   * @param {ValidatedStatus} status
   * @param {string} reasonCode
   * @param {Contact[]} kept
   * @returns {ValidatedResult}
   */
  const result = (status, reasonCode, kept = contacts) => ({
    status,
    reasonCode,
    contacts: kept,
    droppedNames
  })

  if (output.status === 'none') {
    // "No people" with people listed contradicts itself: don't trust either.
    return output.persons.length > 0
      ? result('ambiguous', 'INCONSISTENT_OUTPUT')
      : result('none', output.reasonCode, [])
  }

  if (output.persons.length === 0) {
    return result('ambiguous', 'INCONSISTENT_OUTPUT')
  }

  // A name the memo doesn't contain was invented or altered by the model, so
  // nothing else in this output can be relied on either.
  if (droppedNames > 0) {
    return result('ambiguous', 'UNVERIFIED_NAMES')
  }

  if (contacts.length > MAX_CONTACTS) {
    return result('ambiguous', 'TOO_MANY_NAMES', [])
  }

  return result(output.status, output.reasonCode)
}
