/**
 * SPIKE (DSFAAP-2993): runs the labelled AH_MEMO cases through the live
 * extraction model and scores the prompt and examples.
 *
 * Costs money and needs ANTHROPIC_API_KEY (in .env.local), so it is not part
 * of `npm test` or CI. Every memo it sends is invented.
 *
 *   npm run eval:memo
 *   npm run eval:memo -- --models claude-haiku-5-5,claude-sonnet-5-5 --repeats 3
 *   npm run eval:memo -- --category "prompt injection" --repeats 5
 *   npm run eval:memo -- --case roles-1 --repeats 1
 *   npm run eval:memo -- --set held-out --models baseline:rules,baseline:ner,claude-haiku-5-5
 *
 * `--set dev` (the default) scores the cases the prompt is developed against;
 * `--set held-out` scores the locked set, which the prompt must never be
 * tuned against. `baseline:rules` and `baseline:ner` are the non-AI
 * baselines: free, offline, and scored through the same pipeline.
 *
 * Prints a summary per model and category, the cases that failed or changed
 * answer between repeats, and writes the full results to .eval-results/.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import {
  VERSIONS,
  extractMemoContacts
} from '../src/lib/memo-extraction/index.js'
import {
  getMemoExtractionConfig,
  isModelConfigured
} from '../src/lib/memo-extraction/model.js'
import { cases } from '../src/lib/memo-extraction/eval/cases.js'
import { heldOutCases } from '../src/lib/memo-extraction/eval/held-out-cases.js'
import {
  createBaselineModel,
  isBaseline
} from '../src/lib/memo-extraction/eval/baselines/index.js'
import {
  groupBy,
  scoreRun,
  summarise,
  unstableCases
} from '../src/lib/memo-extraction/eval/score.js'
import { mapWithConcurrency } from '../src/common/helpers/map-with-concurrency.js'

const { values: args } = parseArgs({
  options: {
    models: { type: 'string' },
    set: { type: 'string', default: 'dev' },
    repeats: { type: 'string', default: '3' },
    category: { type: 'string' },
    case: { type: 'string' },
    concurrency: { type: 'string', default: '4' }
  }
})

const baseConfig = getMemoExtractionConfig()

const models = (args.models ?? baseConfig.modelId)
  .split(',')
  .map((m) => m.trim())

if (
  models.some((modelId) => !isBaseline(modelId)) &&
  !isModelConfigured(baseConfig)
) {
  console.error(
    'ANTHROPIC_API_KEY is not set. Put it in .env.local, or set MEMO_EXTRACTION_PROVIDER=bedrock.'
  )
  process.exit(1)
}

/** @type {Record<string, import('../src/lib/memo-extraction/eval/cases.js').MemoCase[]>} */
const SETS = { dev: cases, 'held-out': heldOutCases }
const caseSet = SETS[args.set]

if (!caseSet) {
  console.error(`--set must be one of: ${Object.keys(SETS).join(', ')}`)
  process.exit(1)
}
const repeats = Number(args.repeats)
const concurrency = Number(args.concurrency)

const selected = caseSet.filter(
  (memoCase) =>
    (!args.case || memoCase.id === args.case) &&
    (!args.category || memoCase.category === args.category)
)

if (selected.length === 0) {
  console.error('No cases match --case / --category.')
  process.exit(1)
}

console.log(
  `${args.set} set. Prompt ${VERSIONS.promptVersion}, schema ${VERSIONS.schemaVersion}, policy ${VERSIONS.policyVersion}, effort ${baseConfig.effort ?? 'model default'}: ${selected.length} cases x ${repeats} repeats x ${models.length} model(s) = ${selected.length * repeats * models.length} calls\n`
)

const stamp = new Date().toISOString().replace(/[:.]/g, '-')

mkdirSync('.eval-results', { recursive: true })

for (const modelId of models) {
  const cfg = { ...baseConfig, modelId }
  const model = isBaseline(modelId) ? createBaselineModel(modelId) : undefined
  const jobs = selected.flatMap((memoCase) =>
    Array.from({ length: repeats }, (_, repeat) => ({ memoCase, repeat }))
  )

  /** @type {import('../src/lib/memo-extraction/eval/score.js').RunResult[]} */
  const runs = await mapWithConcurrency(
    jobs,
    concurrency,
    async ({ memoCase, repeat }) => {
      const { memoContacts, diagnostics } = await extractMemoContacts(
        memoCase.memo,
        { cfg, model }
      )

      process.stdout.write('.')

      return {
        caseId: memoCase.id,
        category: memoCase.category,
        repeat,
        memoContacts,
        diagnostics,
        score: scoreRun(memoCase, memoContacts)
      }
    }
  )

  console.log(`\n\n=== ${modelId} ===\n`)

  const byCategory = Object.fromEntries(
    [...groupBy(runs, (run) => run.category)].map(([category, group]) => [
      category,
      summarise(group)
    ])
  )
  const overall = summarise(runs)

  console.table({ ...byCategory, OVERALL: overall })

  const failures = runs.filter((run) => !run.score.pass)

  if (failures.length > 0) {
    console.log('\nFailed runs:')

    for (const run of failures) {
      const memoCase = selected.find((c) => c.id === run.caseId)

      console.log(
        `  ${run.caseId} #${run.repeat}: expected ${JSON.stringify(memoCase?.expectedStatus)} ${JSON.stringify(memoCase?.expectedNames)}, got ${run.memoContacts.status}/${run.memoContacts.reasonCode} ${JSON.stringify(run.memoContacts.contacts.map((c) => `${c.name} (${c.role})`))}`
      )
    }
  }

  const unstable = unstableCases(runs)

  if (unstable.length > 0) {
    console.log(`\nAnswer changed between repeats: ${unstable.join(', ')}`)
  }

  const file = `.eval-results/memo-${args.set}-${modelId.replace(':', '-')}-${stamp}.json`

  writeFileSync(
    file,
    JSON.stringify(
      {
        set: args.set,
        modelId,
        ...VERSIONS,
        repeats,
        effort: cfg.effort,
        overall,
        byCategory,
        unstable,
        runs
      },
      null,
      2
    )
  )

  console.log(`\nFull results: ${file}\n`)
}

// The app logger can hold the event loop open.
process.exit(0)
