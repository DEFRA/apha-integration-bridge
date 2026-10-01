import Joi from 'joi'

import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

/**
 * Read-only aggregate datasets used to discover SAM's supplier-side role and
 * involvement literals before any of them are hard-coded. Each key maps to a
 * sibling `sam-discovery.<key>.sql` file. Every dataset returns reference
 * values and counts only, never a party's details.
 *
 * Temporary: exists because nobody on the team can run SQL against the lower
 * environments directly. Remove once the literals are known.
 */
export const DISCOVERY_DATASETS = Object.freeze({
  roles: 'Every role SAM defines (AHBRP.ROLE reference data, instant)',
  'supplier-role-counts':
    'Current parties per SUPPLIER role type, split by party type',
  'asset-involvement-types':
    'Current rows per ASSET_INVOLVEMENT_TYPE (aggregates the whole table)',
  'asset-involvement-roles':
    'Current rows per involvement type and the role holding it (aggregates the whole table)',
  'supplier-identifier-types':
    'ALT_PARTY_IDENTITY types held by SUPPLIER parties, per role type'
})

export const DISCOVERY_DATASET_KEYS = Object.freeze(
  Object.keys(DISCOVERY_DATASETS)
)

const sqlByDataset = Object.fromEntries(
  DISCOVERY_DATASET_KEYS.map((key) => [
    key,
    loadSQL(import.meta.filename, `.${key}.sql`)
  ])
)

export const SamDiscoverySchema = Joi.object({
  dataset: Joi.string()
    .valid(...DISCOVERY_DATASET_KEYS)
    .required()
    .description('Which aggregate dataset to run')
})

/**
 * @typedef {{ dataset: string }} SamDiscoveryParams
 */

/**
 * @param {SamDiscoveryParams} params
 * @returns {{ sql: string; bindings: Record<string, unknown> }}
 */
export function samDiscoveryQuery(params) {
  const { value, error } = SamDiscoverySchema.validate(params)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  return {
    sql: sqlByDataset[value.dataset],
    bindings: {}
  }
}

/**
 * Runs one discovery dataset and returns its aggregate rows as-is.
 *
 * @param {import('oracledb').Connection} connection
 * @param {SamDiscoveryParams} params
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function samDiscovery(connection, params) {
  return execute(connection, samDiscoveryQuery(params))
}
