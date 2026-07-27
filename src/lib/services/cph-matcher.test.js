import { describe, test, expect, jest } from '@jest/globals'

import { matchCphs, logCphMatchResults } from './cph-matcher.js'
import { findHoldings } from '../db/queries/find-holdings.js'

// Mock the findHoldings function
jest.mock('../db/queries/find-holdings.js', () => ({
  findHoldings: jest.fn()
}))

describe('matchCphs', () => {
  test('should return empty array when no CPH values in payload', async () => {
    const payload = createPayload({})
    const mockLogger = createMockLogger()
    const mockDb = {}

    const results = await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(results).toEqual([])
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { applicationId: 'TB-1234-5678' },
      'No CPH values found in application for matching'
    )
  })

  test('should pass CPH in correct format to findHoldings', async () => {
    const payload = createPayload({
      originCph: {
        type: 'text',
        value: '12/345/6789'
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    findHoldings.mockResolvedValue([
      {
        id: '12/345/6789',
        type: 'holdings'
      }
    ])

    await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(findHoldings).toHaveBeenCalledWith(mockDb, ['12/345/6789'])
  })

  test('should return successful match when CPH found in SAM', async () => {
    const payload = createPayload({
      originCph: {
        type: 'text',
        value: '14/159/0157'
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    findHoldings.mockResolvedValue([
      {
        id: '14/159/0157',
        type: 'holdings'
      }
    ])

    const results = await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
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

  test('should return failed match when CPH not found in SAM', async () => {
    const payload = createPayload({
      destinationCph: {
        type: 'text',
        value: '00/000/0000'
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    findHoldings.mockResolvedValue([])

    const results = await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(results).toEqual([
      {
        applicationCph: '00/000/0000',
        result: false,
        type: 'destination',
        applicationId: 'TB-1234-5678'
      }
    ])
  })

  test('should handle both origin and destination CPH in same application', async () => {
    const payload = createPayload({
      originCph: {
        type: 'text',
        value: '14/159/0157'
      },
      destinationCph: {
        type: 'text',
        value: '45/126/0021'
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    findHoldings.mockResolvedValue([
      {
        id: '14/159/0157',
        type: 'holdings'
      },
      {
        id: '45/126/0021',
        type: 'holdings'
      }
    ])

    const results = await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(results).toEqual([
      {
        applicationCph: '14/159/0157',
        result: true,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      },
      {
        applicationCph: '45/126/0021',
        result: true,
        type: 'destination',
        applicationId: 'TB-1234-5678'
      }
    ])
  })

  test('should handle partial matches (one found, one not found)', async () => {
    const payload = createPayload({
      originCph: {
        type: 'text',
        value: '14/159/0157'
      },
      destinationCph: {
        type: 'text',
        value: '00/000/0000'
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    // Only origin CPH found
    findHoldings.mockResolvedValue([
      {
        id: '14/159/0157',
        type: 'holdings'
      }
    ])

    const results = await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(results).toEqual([
      {
        applicationCph: '14/159/0157',
        result: true,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      },
      {
        applicationCph: '00/000/0000',
        result: false,
        type: 'destination',
        applicationId: 'TB-1234-5678'
      }
    ])
  })

  test('should handle database errors gracefully', async () => {
    const payload = createPayload({
      originCph: {
        type: 'text',
        value: '14/159/0157'
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    const dbError = new Error('Database connection failed')
    findHoldings.mockRejectedValue(dbError)

    const results = await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(results).toEqual([
      {
        applicationCph: '14/159/0157',
        result: false,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      }
    ])

    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        err: dbError,
        applicationId: 'TB-1234-5678',
        cphIds: ['14/159/0157']
      },
      'Error querying SAM database for CPH matching'
    )
  })

  test('should handle CPH values with whitespace', async () => {
    const payload = createPayload({
      originCph: {
        type: 'text',
        value: '12/345/6789 '
      }
    })
    const mockLogger = createMockLogger()
    const mockDb = {}

    findHoldings.mockResolvedValue([])

    await matchCphs({
      samdb: mockDb,
      payload,
      logger: mockLogger
    })

    expect(findHoldings).toHaveBeenCalledWith(mockDb, ['12/345/6789'])
  })
})

describe('logCphMatchResults', () => {
  test('should log successful matches with structured data', () => {
    const mockLogger = createMockLogger()
    const matchResults = [
      {
        applicationCph: '14/159/0157',
        result: true,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      }
    ]

    logCphMatchResults(mockLogger, matchResults)

    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        cphMatch: matchResults[0]
      },
      'CPH match SUCCESS: 14/159/0157 (origin) for application TB-1234-5678'
    )
  })

  test('should log failed matches with structured data', () => {
    const mockLogger = createMockLogger()
    const matchResults = [
      {
        applicationCph: '00/000/0000',
        result: false,
        type: 'destination',
        applicationId: 'TB-1234-5680'
      }
    ]

    logCphMatchResults(mockLogger, matchResults)

    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        cphMatch: matchResults[0]
      },
      'CPH match FAILED: 00/000/0000 (destination) for application TB-1234-5680'
    )
  })

  test('should log multiple matches', () => {
    const mockLogger = createMockLogger()
    const matchResults = [
      {
        applicationCph: '14/159/0157',
        result: true,
        type: 'origin',
        applicationId: 'TB-1234-5678'
      },
      {
        applicationCph: '45/126/0021',
        result: true,
        type: 'destination',
        applicationId: 'TB-1234-5678'
      }
    ]

    logCphMatchResults(mockLogger, matchResults)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      1,
      {
        cphMatch: matchResults[0]
      },
      'CPH match SUCCESS: 14/159/0157 (origin) for application TB-1234-5678'
    )
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      2,
      {
        cphMatch: matchResults[1]
      },
      'CPH match SUCCESS: 45/126/0021 (destination) for application TB-1234-5678'
    )
  })

  test('should handle empty match results array', () => {
    const mockLogger = createMockLogger()

    logCphMatchResults(mockLogger, [])

    expect(mockLogger.info).not.toHaveBeenCalled()
  })
})

/**
 * Creates a minimal valid payload for testing
 * @param {object} keyFactsOverrides - Key facts to merge into the default payload
 * @returns {import('../../types/case-management/case.js').CreateCasePayload}
 */
function createPayload(keyFactsOverrides = {}) {
  return {
    journeyId: 'TB123',
    journeyVersion: {
      major: 1,
      minor: 0
    },
    applicationReferenceNumber: 'TB-1234-5678',
    sections: [
      {
        sectionKey: 'section-1',
        title: 'Section 1',
        questionAnswers: [
          {
            question: 'Test question',
            questionKey: 'test-q',
            answer: {
              type: 'text',
              value: 'Test answer',
              displayText: 'Test answer'
            }
          }
        ]
      }
    ],
    keyFacts: {
      licenceType: {
        type: 'text',
        value: 'TB15'
      },
      requester: {
        type: 'text',
        value: 'origin'
      },
      ...keyFactsOverrides
    },
    applicant: {
      type: 'guest',
      emailAddress: 'test@example.com',
      name: {
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  }
}

/**
 * Creates a mock logger for testing
 * @returns {import('pino').Logger}
 */
function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}
