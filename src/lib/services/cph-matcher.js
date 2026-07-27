import { findHoldings } from '../db/queries/find-holdings.js'

/**
 * @import {CreateCasePayload} from '../../types/case-management/case.js'
 * @import {Logger} from 'pino'
 */

function extractCphsFromPayload(payload) {
  const cphs = []

  if (payload.keyFacts?.originCph?.value) {
    cphs.push({
      cph: String(payload.keyFacts.originCph.value).trim(),
      type: 'origin'
    })
  }

  if (payload.keyFacts?.destinationCph?.value) {
    cphs.push({
      cph: String(payload.keyFacts.destinationCph.value).trim(),
      type: 'destination'
    })
  }

  return cphs
}

export async function matchCphs({ samdb, payload, logger }) {
  const applicationId = payload.applicationReferenceNumber
  const cphs = extractCphsFromPayload(payload)

  if (cphs.length === 0) {
    logger.debug({ applicationId }, 'No CPH values found in application')
    return []
  }

  const cphIds = cphs.map((c) => c.cph)
  const results = []

  try {
    const holdings = await findHoldings(samdb, cphIds)
    const foundCphIds = new Set(holdings.map((h) => h.id))

    for (const { cph, type } of cphs) {
      results.push({
        applicationCph: cph,
        result: foundCphIds.has(cph),
        type,
        applicationId
      })
    }
  } catch (error) {
    logger.error(
      { err: error, applicationId, cphIds },
      'CPH matching query failed'
    )

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

export function logCphMatchResults(logger, matchResults) {
  for (const match of matchResults) {
    logger.info(
      { cphMatch: match },
      `CPH match ${match.result ? 'SUCCESS' : 'FAILED'}: ${match.applicationCph} (${match.type})`
    )
  }
}
