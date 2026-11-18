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
 *
 * Prints a summary per model and category, the cases that failed or changed
 * answer between repeats, and writes the full results to .eval-results/.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { extractMemoContacts } from '../src/lib/memo-extraction/index.js'
import {
  getMemoExtractionConfig,
  isModelConfigured
} from '../src/lib/memo-extraction/model.js'
import { PROMPT_VERSION } from '../src/lib/memo-extraction/prompt.js'
import { cases } from '../src/lib/memo-extraction/eval/cases.js'
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
    repeats: { type: 'string', default: '3' },
    category: { type: 'string' },
    case: { type: 'string' },
    concurrency: { type: 'string', default: '4' }
  }
})

const baseConfig = getMemoExtractionConfig()

if (!isModelConfigured(baseConfig)) {
  console.error(
    'ANTHROPIC_API_KEY is not set. Put it in .env.local, or set MEMO_EXTRACTION_PROVIDER=bedrock.'
  )
  process.exit(1)
}

const models = (args.models ?? baseConfig.modelId)
  .split(',')
  .map((m) => m.trim())
const repeats = Number(args.repeats)
const concurrency = Number(args.concurrency)

const selected = cases.filter(
  (memoCase) =>
    (!args.case || memoCase.id === args.case) &&
    (!args.category || memoCase.category === args.category)
)

if (selected.length === 0) {
  console.error('No cases match --case / --category.')
  process.exit(1)
}

console.log(
  `Prompt ${PROMPT_VERSION}, ${selected.length} cases x ${repeats} repeats x ${models.length} model(s) = ${selected.length * repeats * models.length} calls\n`
)

const stamp = new Date().toISOString().replace(/[:.]/g, '-')

mkdirSync('.eval-results', { recursive: true })

for (const modelId of models) {
  const cfg = { ...baseConfig, modelId }
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
        { cfg }
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

  const file = `.eval-results/memo-${modelId}-${stamp}.json`

  writeFileSync(
    file,
    JSON.stringify(
      {
        modelId,
        promptVersion: PROMPT_VERSION,
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
