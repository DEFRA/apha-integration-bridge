/**
 * SPIKE (DSFAAP-2993): a non-AI baseline for scoring, as the AICE advice asks
 * ("deterministic patterns"). Hand-written patterns find names after a title
 * ("Mrs D Atherton") or after a cue word ("spoke to Gwen Pritchard",
 * "stockman Tomasz"). It never says "ambiguous" and makes no attempt at the
 * judgement calls the model makes; it is here to show what the model adds.
 *
 * Only the scoring script uses it.
 */

const TITLE = String.raw`(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Rev)\.?`
const INITIALS = String.raw`(?:[A-Z]\.?\s+){0,3}`
const WORD = String.raw`[A-Z][a-z]+(?:['’-][A-Z]?[a-z]+)*`
const NAME = String.raw`${WORD}(?:\s+${WORD})?`

/**
 * Words after which a capitalised name is taken as a person, with the role
 * the cue suggests.
 *
 * @type {Array<[string, string | null]>}
 */
const CUES = [
  ['spoke to', 'contact'],
  ['speak to', 'contact'],
  ['ask for', 'contact'],
  ['contact', 'contact'],
  ['agent', 'agent'],
  ['keeper', 'keeper'],
  ['stockman', 'keeper'],
  ['herdsman', 'keeper'],
  ['manager', 'keeper'],
  ['owner', 'owner'],
  ['vet', 'vet'],
  ['son', null],
  ['daughter', null],
  ['wife', null],
  ['husband', null]
]

/** Words that end a place or organisation, never a person's name. */
const NOT_A_SURNAME = new Set([
  'Farm',
  'Farms',
  'Barn',
  'House',
  'Lane',
  'Road',
  'Street',
  'Ltd',
  'Limited',
  'Partners',
  'Vets',
  'Veterinary',
  'Services',
  'Dairies',
  'Estate',
  'Estates',
  'Holdings'
])

const titled = new RegExp(String.raw`\b${TITLE}\s+${INITIALS}${NAME}`, 'g')

const cued = new RegExp(
  String.raw`\b(${CUES.map(([cue]) => cue).join('|')})\b(?:\s+is)?[\s:,-]+(${NAME})`,
  'gi'
)

/**
 * Whether a match is really a place or organisation ("Rose Farm" after a cue,
 * "Heathfield Partners").
 *
 * @param {string} name
 */
const isPlaceOrOrganisation = (name) =>
  name.split(/\s+/).some((word) => NOT_A_SURNAME.has(word))

/**
 * @param {string} memo
 * @returns {Array<{ name: string, role: string | null }>}
 */
export const findNamesByRules = (memo) => {
  /** @type {Map<string, { name: string, role: string | null, at: number }>} */
  const found = new Map()

  /**
   * @param {string} name
   * @param {string | null} role
   * @param {number} at
   */
  const add = (name, role, at) => {
    if (isPlaceOrOrganisation(name)) {
      return
    }

    // A titled match and a cued match of the same person overlap: keep the
    // longer (titled) form, and the cue's role.
    for (const [key, existing] of found) {
      if (existing.name.includes(name) || name.includes(existing.name)) {
        const longer = name.length > existing.name.length ? name : existing.name

        found.delete(key)
        found.set(longer, {
          name: longer,
          role: existing.role ?? role,
          at: Math.min(existing.at, at)
        })

        return
      }
    }

    found.set(name, { name, role, at })
  }

  for (const match of memo.matchAll(titled)) {
    add(match[0].trim(), null, match.index)
  }

  for (const match of memo.matchAll(cued)) {
    const cue = match[1].toLowerCase()
    const role = CUES.find(([word]) => word === cue)?.[1] ?? null

    // The cue match is case-insensitive, so check the name really is
    // capitalised ("contact details" is not a person).
    if (/^[A-Z]/.test(match[2])) {
      add(match[2], role, match.index)
    }
  }

  return [...found.values()]
    .sort((a, b) => a.at - b.at)
    .map(({ name, role }) => ({ name, role }))
}
