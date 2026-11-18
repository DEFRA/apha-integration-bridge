/**
 * SPIKE (DSFAAP-2993): scoring for the labelled memo cases. Pure functions,
 * used by scripts/eval-memo-extraction.js.
 */
import { normaliseName } from '../validate.js'

/**
 * @typedef {import('./cases.js').MemoCase} MemoCase
 * @typedef {import('../index.js').MemoContacts} MemoContacts
 * @typedef {import('../index.js').MemoExtractionDiagnostics} MemoExtractionDiagnostics
 * @typedef {{
 *   statusCorrect: boolean,
 *   unavailable: boolean,
 *   truePositives: number,
 *   falsePositives: number,
 *   falseNegatives: number,
 *   rolesChecked: number,
 *   rolesCorrect: number,
 *   pass: boolean
 * }} RunScore
 * @typedef {{
 *   caseId: string,
 *   category: string,
 *   repeat: number,
 *   memoContacts: MemoContacts,
 *   diagnostics: MemoExtractionDiagnostics,
 *   score: RunScore
 * }} RunResult
 */

/**
 * Scores one extraction against its labelled case. A run passes when the
 * status is one the case accepts and the names match exactly (no missing,
 * no extra). Roles are reported separately and don't affect the pass.
 *
 * @param {MemoCase} memoCase
 * @param {MemoContacts} memoContacts
 * @returns {RunScore}
 */
export const scoreRun = (memoCase, memoContacts) => {
  const statusCorrect = /** @type {string[]} */ ([])
    .concat(memoCase.expectedStatus)
    .includes(memoContacts.status)
  const unavailable = memoContacts.status === 'unavailable'

  let truePositives = 0
  let falseNegatives = 0
  let falsePositives = 0
  let rolesChecked = 0
  let rolesCorrect = 0

  if (memoCase.scoreNames !== false && !unavailable) {
    const predicted = memoContacts.contacts.map((contact) => ({
      key: normaliseName(contact.name),
      role: contact.role
    }))
    const matched = new Set()

    for (const expected of memoCase.expectedNames) {
      const forms = /** @type {string[]} */ ([]).concat(expected)
      const keys = forms.map(normaliseName)
      const index = predicted.findIndex(
        (candidate, i) => !matched.has(i) && keys.includes(candidate.key)
      )

      if (index === -1) {
        falseNegatives++
        continue
      }

      matched.add(index)
      truePositives++

      const roles = memoCase.expectedRoles ?? {}

      if (forms[0] in roles) {
        rolesChecked++

        if (predicted[index].role === roles[forms[0]]) {
          rolesCorrect++
        }
      }
    }

    falsePositives = predicted.length - matched.size
  }

  return {
    statusCorrect,
    unavailable,
    truePositives,
    falsePositives,
    falseNegatives,
    rolesChecked,
    rolesCorrect,
    pass:
      statusCorrect &&
      !unavailable &&
      falsePositives === 0 &&
      falseNegatives === 0
  }
}

/**
 * @param {number[]} values
 * @param {number} p between 0 and 1
 */
export const percentile = (values, p) => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]
}

/**
 * @param {number} numerator
 * @param {number} denominator
 */
const ratio = (numerator, denominator) =>
  denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 1000

/**
 * Totals for a group of runs (a category, or everything).
 *
 * @param {RunResult[]} runs
 */
export const summarise = (runs) => {
  const sum = (/** @type {(run: RunResult) => number} */ pick) =>
    runs.reduce((total, run) => total + pick(run), 0)

  const tp = sum((run) => run.score.truePositives)
  const fp = sum((run) => run.score.falsePositives)
  const fn = sum((run) => run.score.falseNegatives)
  const latencies = runs.map((run) => run.diagnostics.latencyMs)

  return {
    runs: runs.length,
    passRate: ratio(
      sum((run) => Number(run.score.pass)),
      runs.length
    ),
    statusAccuracy: ratio(
      sum((run) => Number(run.score.statusCorrect)),
      runs.length
    ),
    namePrecision: ratio(tp, tp + fp),
    nameRecall: ratio(tp, tp + fn),
    roleAccuracy: ratio(
      sum((run) => run.score.rolesCorrect),
      sum((run) => run.score.rolesChecked)
    ),
    unavailable: sum((run) => Number(run.score.unavailable)),
    namesDropped: sum((run) => run.diagnostics.droppedNames),
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
    inputTokens: sum((run) => run.diagnostics.usage?.inputTokens ?? 0),
    outputTokens: sum((run) => run.diagnostics.usage?.outputTokens ?? 0)
  }
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} key
 * @returns {Map<string, T[]>}
 */
export const groupBy = (items, key) => {
  const groups = new Map()

  for (const item of items) {
    const k = key(item)

    groups.set(k, [...(groups.get(k) ?? []), item])
  }

  return groups
}

/**
 * Cases whose answer changed between repeats (status or names). The same
 * memo giving different answers is a reliability problem even when some of
 * the answers are right.
 *
 * @param {RunResult[]} runs
 * @returns {string[]} case ids
 */
export const unstableCases = (runs) =>
  [...groupBy(runs, (run) => run.caseId)]
    .filter(([, caseRuns]) => {
      const answers = new Set(
        caseRuns.map((run) =>
          [
            run.memoContacts.status,
            ...run.memoContacts.contacts
              .map((contact) => normaliseName(contact.name))
              .sort()
          ].join('|')
        )
      )

      return answers.size > 1
    })
    .map(([caseId]) => caseId)
