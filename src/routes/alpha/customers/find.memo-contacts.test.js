import Hapi from '@hapi/hapi'
import { beforeAll, describe, expect, jest, test } from '@jest/globals'

import route from './find.js'
import { customer1 } from './find.mocks.js'
import { memoCustomers, memos } from './find.memos.js'
import { extractMemoContacts } from '../../../lib/memo-extraction/index.js'
import { getMemoExtractionConfig } from '../../../lib/memo-extraction/model.js'
import { mask } from '../../../lib/pii/index.js'
import { piiContextPlugin } from '../../../common/helpers/pii-context.js'

jest.mock('../../../lib/memo-extraction/index.js', () => ({
  __esModule: true,
  extractMemoContacts: jest.fn()
}))

const extract = /** @type {jest.MockedFunction<typeof extractMemoContacts>} */ (
  extractMemoContacts
)

const path = '/customers/find'

/**
 * @param {string} name
 */
const found = (name) => ({
  status: /** @type {const} */ ('found'),
  reasonCode: 'SINGLE_PERSON',
  contacts: [{ name, role: null, sourceMatch: /** @type {const} */ ('exact') }],
  meta: {
    modelId: 'test-model',
    promptVersion: '1.0.0',
    schemaVersion: '1.0.0',
    policyVersion: '1.0.0'
  }
})

describe('alpha customers/find memo contacts (spike)', () => {
  const server = Hapi.server()
  const logInfo = jest.fn()

  server.decorate(
    'request',
    'logger',
    /** @type {any} */ ({
      info: logInfo,
      warn: () => {},
      error: () => {},
      debug: () => {}
    })
  )

  beforeAll(async () => {
    // With no client scopes the PII plugin masks by default, so this proves
    // the alpha route deliberately turns masking off for its synthetic data.
    await server.register(piiContextPlugin)
    server.route({ ...route, path, method: 'POST' })
  })

  /**
   * @param {string[]} ids
   */
  const find = (ids) =>
    server.inject({
      method: 'POST',
      url: `${path}?page=1&pageSize=20`,
      payload: { ids }
    })

  test('runs each returned customer memo through extraction, unmasked', async () => {
    extract.mockImplementation(async (memo) => {
      // The real extractMemoContacts masks names with mask(); call it here
      // so the test sees whatever masking context the route set up.
      const name = /** @type {string} */ (mask('Bert Farmer'))

      return {
        memoContacts: found(memo === memos[customer1.id] ? name : 'Other'),
        diagnostics: { latencyMs: 1, usage: null, droppedNames: 0 }
      }
    })

    const memoOnly = memoCustomers[0]
    const response = await find([customer1.id, memoOnly.id])

    expect(response.statusCode).toBe(200)
    expect(extract).toHaveBeenCalledWith(memos[customer1.id])
    expect(extract).toHaveBeenCalledWith(memos[memoOnly.id])
    expect(response.result).toMatchObject({
      data: [
        { ...customer1, memoContacts: found('Bert Farmer') },
        { ...memoOnly, memoContacts: found('Other') }
      ]
    })
  })

  test('logs status and timings but never the memo or names', async () => {
    extract.mockResolvedValue({
      memoContacts: found('Bert Farmer'),
      diagnostics: { latencyMs: 7, usage: null, droppedNames: 0 }
    })

    await find([customer1.id])

    expect(logInfo).toHaveBeenCalledWith(
      {
        memoExtraction: {
          customerId: customer1.id,
          status: 'found',
          reasonCode: 'SINGLE_PERSON',
          modelId: 'test-model',
          promptVersion: '1.0.0',
          schemaVersion: '1.0.0',
          policyVersion: '1.0.0',
          latencyMs: 7,
          usage: null,
          droppedNames: 0
        }
      },
      'memo contact extraction'
    )

    const logged = JSON.stringify(logInfo.mock.calls)

    expect(logged).not.toContain('Bert')
    expect(logged).not.toContain('Farmer')
  })

  test('never has more extractions in flight than the configured limit', async () => {
    const limit = getMemoExtractionConfig().maxConcurrency
    let inFlight = 0
    let maxInFlight = 0

    extract.mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--

      return {
        memoContacts: found('Someone'),
        diagnostics: { latencyMs: 1, usage: null, droppedNames: 0 }
      }
    })

    const ids = memoCustomers.map((customer) => customer.id)
    const response = await find(ids)

    expect(response.result?.data).toHaveLength(ids.length)
    expect(ids.length).toBeGreaterThan(limit)
    expect(maxInFlight).toBe(limit)
  })
})
