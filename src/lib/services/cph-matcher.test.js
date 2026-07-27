import { describe, test, expect, jest } from '@jest/globals'
import { matchCphs, logCphMatchResults } from './cph-matcher.js'
import { findHoldings } from '../db/queries/find-holdings.js'

jest.mock('../db/queries/find-holdings.js', () => ({
  findHoldings: jest.fn()
}))

describe('matchCphs', () => {
  test('returns empty when no CPH in payload', async () => {
    const results = await matchCphs({
      samdb: {},
      payload: createPayload({}),
      logger: createMockLogger()
    })

    expect(results).toEqual([])
  })

  test('returns match result for found CPH', async () => {
    findHoldings.mockResolvedValue([{ id: '14/159/0157', type: 'holdings' }])

    const results = await matchCphs({
      samdb: {},
      payload: createPayload({
        originCph: { type: 'text', value: '14/159/0157' }
      }),
      logger: createMockLogger()
    })

    expect(results).toEqual([
      {
        applicationCph: '14/159/0157',
        result: true,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      }
    ])
  })

  test('returns false for CPH not in SAM', async () => {
    findHoldings.mockResolvedValue([])

    const results = await matchCphs({
      samdb: {},
      payload: createPayload({
        destinationCph: { type: 'text', value: '00/000/0000' }
      }),
      logger: createMockLogger()
    })

    expect(results[0].result).toBe(false)
  })

  test('handles multiple CPHs', async () => {
    findHoldings.mockResolvedValue([
      { id: '14/159/0157', type: 'holdings' },
      { id: '45/126/0021', type: 'holdings' }
    ])

    const results = await matchCphs({
      samdb: {},
      payload: createPayload({
        originCph: { type: 'text', value: '14/159/0157' },
        destinationCph: { type: 'text', value: '45/126/0021' }
      }),
      logger: createMockLogger()
    })

    expect(results).toHaveLength(2)
    expect(results[0].result).toBe(true)
    expect(results[1].result).toBe(true)
  })

  test('handles DB errors', async () => {
    findHoldings.mockRejectedValue(new Error('DB error'))

    const results = await matchCphs({
      samdb: {},
      payload: createPayload({
        originCph: { type: 'text', value: '14/159/0157' }
      }),
      logger: createMockLogger()
    })

    expect(results[0].result).toBe(false)
  })
})

describe('logCphMatchResults', () => {
  test('logs match results', () => {
    const mockLogger = createMockLogger()

    logCphMatchResults(mockLogger, [
      {
        applicationCph: '14/159/0157',
        result: true,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      }
    ])

    expect(mockLogger.info).toHaveBeenCalled()
  })
})

function createPayload(keyFactsOverrides = {}) {
  return {
    journeyId: 'TB123',
    journeyVersion: { major: 1, minor: 0 },
    applicationReferenceNumber: 'TB-1234-5678',
    sections: [
      {
        sectionKey: 'section-1',
        title: 'Section 1',
        questionAnswers: [
          {
            question: 'Test question',
            questionKey: 'test-q',
            answer: { type: 'text', value: 'Test', displayText: 'Test' }
          }
        ]
      }
    ],
    keyFacts: {
      licenceType: { type: 'text', value: 'TB15' },
      requester: { type: 'text', value: 'origin' },
      ...keyFactsOverrides
    },
    applicant: {
      type: 'guest',
      emailAddress: 'test@example.com',
      name: { firstName: 'John', lastName: 'Doe' }
    }
  }
}

function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}
