import { describe, expect, jest, test } from '@jest/globals'

import { runWithMaskingContext } from '../pii/index.js'
import { extractMemoContacts } from './index.js'
import { MemoModelError } from './model.js'
import { PROMPT_VERSION } from './prompt.js'

/** @type {import('./model.js').MemoExtractionConfig} */
const cfg = {
  provider: 'anthropic',
  modelId: 'test-model',
  anthropicApiKey: null,
  effort: null,
  maxTokens: 1000,
  timeoutMs: 1000,
  maxMemoChars: 100,
  maxConcurrency: 2
}

const meta = { modelId: 'test-model', promptVersion: PROMPT_VERSION }

/**
 * @param {import('./schema.js').ModelOutput} output
 * @returns {import('./model.js').MemoModel}
 */
const modelReturning = (output) => ({
  extract: jest.fn(async () => ({
    output,
    usage: { inputTokens: 10, outputTokens: 5 }
  }))
})

/**
 * @param {unknown} error
 * @returns {import('./model.js').MemoModel}
 */
const modelThrowing = (error) => ({
  extract: async () => {
    throw error
  }
})

describe('extractMemoContacts', () => {
  test('sends the trimmed memo and returns verified contacts', async () => {
    const model = modelReturning({
      status: 'found',
      reasonCode: 'SINGLE_PERSON',
      persons: [{ name: 'Mrs P Okafor', role: 'owner' }]
    })

    const { memoContacts, diagnostics } = await extractMemoContacts(
      '  Contact Mrs P Okafor (owner)  ',
      { model, cfg }
    )

    expect(model.extract).toHaveBeenCalledWith('Contact Mrs P Okafor (owner)', {
      signal: expect.any(AbortSignal)
    })
    expect(memoContacts).toEqual({
      status: 'found',
      reasonCode: 'SINGLE_PERSON',
      contacts: [{ name: 'Mrs P Okafor', role: 'owner', sourceMatch: 'exact' }],
      meta
    })
    expect(diagnostics).toMatchObject({
      usage: { inputTokens: 10, outputTokens: 5 },
      droppedNames: 0,
      latencyMs: expect.any(Number)
    })
  })

  test('masks names when the request has no pii scope', async () => {
    const model = modelReturning({
      status: 'found',
      reasonCode: 'SINGLE_PERSON',
      persons: [{ name: 'Gwen Pritchard', role: 'agent' }]
    })

    const { memoContacts } = await runWithMaskingContext(
      { shouldMask: true },
      () => extractMemoContacts('Agent Gwen Pritchard', { model, cfg })
    )

    expect(memoContacts.contacts[0].name).toBe('G************d')
  })

  test.each([null, undefined, '', '   '])(
    'an empty memo (%p) is "none" without calling the model',
    async (memo) => {
      const model = modelReturning({
        status: 'none',
        reasonCode: 'NO_PERSON_NAMED',
        persons: []
      })

      const { memoContacts } = await extractMemoContacts(memo, { model, cfg })

      expect(memoContacts).toEqual({
        status: 'none',
        reasonCode: 'EMPTY_MEMO',
        contacts: [],
        meta
      })
      expect(model.extract).not.toHaveBeenCalled()
    }
  )

  test('a memo over the length limit is not sent', async () => {
    const model = modelReturning({
      status: 'none',
      reasonCode: 'NO_PERSON_NAMED',
      persons: []
    })

    const { memoContacts } = await extractMemoContacts('x'.repeat(101), {
      model,
      cfg
    })

    expect(memoContacts).toMatchObject({
      status: 'unavailable',
      reasonCode: 'MEMO_TOO_LONG'
    })
    expect(model.extract).not.toHaveBeenCalled()
  })

  test('without an API key it is unavailable, not an error', async () => {
    const { memoContacts } = await extractMemoContacts('Agent Gwen Pritchard', {
      cfg
    })

    expect(memoContacts).toEqual({
      status: 'unavailable',
      reasonCode: 'NOT_CONFIGURED',
      contacts: [],
      meta
    })
  })

  test.each(
    /** @type {const} */ (['TIMEOUT', 'INVALID_OUTPUT', 'MODEL_ERROR'])
  )('a model failure (%s) is unavailable with that code', async (code) => {
    const { memoContacts } = await extractMemoContacts('Agent Gwen Pritchard', {
      model: modelThrowing(new MemoModelError(code)),
      cfg
    })

    expect(memoContacts).toMatchObject({
      status: 'unavailable',
      reasonCode: code,
      contacts: []
    })
  })

  test('an unexpected error is unavailable (MODEL_ERROR)', async () => {
    const { memoContacts } = await extractMemoContacts('Agent Gwen Pritchard', {
      model: modelThrowing(new TypeError('boom')),
      cfg
    })

    expect(memoContacts).toMatchObject({
      status: 'unavailable',
      reasonCode: 'MODEL_ERROR'
    })
  })

  test('the model is given an abort signal that fires at the deadline', async () => {
    /** @type {AbortSignal | undefined} */
    let received

    const model = {
      extract: async (
        /** @type {string} */ _memo,
        /** @type {{ signal: AbortSignal }} */ { signal }
      ) => {
        received = signal

        await new Promise((resolve) =>
          signal.addEventListener('abort', resolve)
        )

        throw new MemoModelError('TIMEOUT')
      }
    }

    const { memoContacts } = await extractMemoContacts('Agent Gwen Pritchard', {
      model,
      cfg: { ...cfg, timeoutMs: 20 }
    })

    expect(received?.aborted).toBe(true)
    expect(memoContacts.reasonCode).toBe('TIMEOUT')
  })
})
