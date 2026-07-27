import { findHoldings } from '../db/queries/find-holdings.js'

/**
 * @import {CreateCasePayload} from '../../types/case-management/case.js'
 * @import {Logger} from 'pino'
 */

/**
 * @typedef {Object} CphMatchResult
 * @property {string} applicationCph - The CPH number from the application
 * @property {boolean} result - Whether the CPH was found in SAM
 * @property {'origin'|'destination'} type - The type of CPH
 * @property {string} applicationId - The application reference number
 */

/**
 * Extracts CPH values from application payload
 * CPH format is "12/345/6789"
 *
 * @param {CreateCasePayload} payload - The application payload
 * @returns {Array<{cph: string, type: 'origin'|'destination'}>}
 */
function extractCphsFromPayload(payload) {
  const cphs = []

  if (payload.keyFacts?.originCph?.value) {
    const cphValue = String(payload.keyFacts.originCph.value).trim()
    cphs.push({
      cph: cphValue,
      type: 'origin'
    })
  }

  if (payload.keyFacts?.destinationCph?.value) {
    const cphValue = String(payload.keyFacts.destinationCph.value).trim()
    cphs.push({
      cph: cphValue,
      type: 'destination'
    })
  }

  return cphs
}

/**
 * Matches CPHs from application against SAM database
 *
 * @param {object} params
 * @param {import('oracledb').Connection} params.samdb - SAM database connection
 * @param {CreateCasePayload} params.payload - Application payload
 * @param {Logger} params.logger - Logger instance
 * @returns {Promise<CphMatchResult[]>} - Array of match results
 */
export async function matchCphs({ samdb, payload, logger }) {
  const applicationId = payload.applicationReferenceNumber
  const cphs = extractCphsFromPayload(payload)

  if (cphs.length === 0) {
    logger.debug(
      { applicationId },
      'No CPH values found in application for matching'
    )
    return []
  }

  const cphIds = cphs.map((c) => c.cph)
  const results = []

  try {
    // Query SAM database for all CPHs
    const holdings = await findHoldings(samdb, cphIds)

    // Create a set of found CPH IDs for quick lookup
    const foundCphIds = new Set(holdings.map((h) => h.id))

    // Check each CPH and create result
    for (const { cph, type } of cphs) {
      const result = foundCphIds.has(cph)
      results.push({
        applicationCph: cph,
        result,
        type,
        applicationId
      })
    }
  } catch (error) {
    logger.error(
      {
        err: error,
        applicationId,
        cphIds
      },
      'Error querying SAM database for CPH matching'
    )
    // Return failed results for all CPHs
    for (const { cph, type } of cphs) {
      results.push({
        applicationCph: cph,
        result: false,
        type,
        applicationId
      })
    }
  }

  return results
}

/**
 * Logs CPH match results in structured format for reporting
 *
 * @param {Logger} logger - Logger instance
 * @param {CphMatchResult[]} matchResults - Array of match results
 */
export function logCphMatchResults(logger, matchResults) {
  for (const matchResult of matchResults) {
    logger.info(
      {
        cphMatch: matchResult
      },
      `CPH match ${matchResult.result ? 'SUCCESS' : 'FAILED'}: ${matchResult.applicationCph} (${matchResult.type}) for application ${matchResult.applicationId}`
    )
  }
}
