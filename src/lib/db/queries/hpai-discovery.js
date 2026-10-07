import Joi from 'joi'

import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

/**
 * @typedef {'catalogue' | 'reference' | 'scan'} DatasetKind
 * @typedef {{ kind: DatasetKind, description: string, answers: string }} DatasetDefinition
 */

/**
 * Read-only datasets that answer the open questions in the HPAI contract and
 * delivery plan (docs/hpai-api-contract.md, docs/hpai-api-change-plan.md).
 * Each key maps to a sibling `hpai-discovery.<key>.sql` file. Every dataset
 * returns catalogue metadata, reference codes, or counts and value shapes;
 * none returns a party's name, address, contact details or identifier.
 *
 * Kinds: `catalogue` reads the Oracle data dictionary and is instant;
 * `reference` reads small reference tables; `scan` aggregates whole SAM
 * tables and takes seconds.
 *
 * Temporary: exists because nobody on the team can run SQL against the lower
 * environments directly. Remove once the questions are answered.
 *
 * @type {Readonly<Record<string, DatasetDefinition>>}
 */
export const HPAI_DISCOVERY_DATASETS = Object.freeze({
  columns: {
    kind: 'catalogue',
    description:
      'Columns of the SAM tables the HPAI contract reads, with type and nullability',
    answers:
      'Which columns exist in this database. The local schema is a subset of the real one, and some columns appear only in the 2018 model'
  },
  indexes: {
    kind: 'catalogue',
    description: 'Indexes on the SAM tables the HPAI contract reads',
    answers:
      'Whether FEATURE_STATE, FEATURE_POINT, FEATURE_ADDRESS, PARTY_ROLE_STATE and the other satellite tables are indexed on the columns the new queries join on'
  },
  'ref-data-codes': {
    kind: 'reference',
    description:
      'Current reference-data codes and English labels for role, feature, location, organisation, contact, involvement and status sets',
    answers:
      'The <TBC> code lists in contract appendix B, and which reference set decodes roles[].roleName'
  },
  'cph-holderships': {
    kind: 'scan',
    description:
      "CPH numbers by number of active holderships, with the causes of today's 409",
    answers:
      'The multi-holdership rule: how many CPH numbers have several active holderships, share a location, are multiplied by duplicate state rows, CPH rows or local-authority rows, would 409 today, or have no matching (CPH, core id) row'
  },
  'feature-types': {
    kind: 'scan',
    description:
      'FEATURE_TYPE values for locations, sub-locations and other features',
    answers: 'The featureType code list (appendix B, question 5)'
  },
  'feature-states': {
    kind: 'scan',
    description:
      'Current feature status and reason codes, future-dated rows, and features with several current states',
    answers:
      'status.code and status.reasonCode, and whether the active-holdership predicate can multiply rows'
  },
  'feature-relationships': {
    kind: 'scan',
    description:
      'FEATURE_RELATIONSHIP types with which end is a location or a sub-location',
    answers: 'How a premises reaches its sub-locations, and in which direction'
  },
  'sub-locations': {
    kind: 'scan',
    description:
      'SUB_LOCATION_TYPE values, how often their attributes are filled, and how many link to a location',
    answers:
      'The subLocationType code list and how well usableArea, usualStockQuantity and broilerStockingDensityRange are populated'
  },
  'sub-locations-per-location': {
    kind: 'scan',
    description: 'Locations by number of current sub-locations',
    answers: 'How large subLocations[] gets'
  },
  'feature-points': {
    kind: 'scan',
    description:
      'Current primary points by feature subtype and point type, with easting and northing ranges',
    answers:
      'position: how many features have a point, several points, or a map reference without easting and northing, and the pointType code list'
  },
  'points-per-feature': {
    kind: 'scan',
    description:
      'Features by number of current primary points, with how many mix point types',
    answers:
      'Whether position can be a single object, or needs a rule to choose one point'
  },
  'os-map-reference-formats': {
    kind: 'scan',
    description:
      'The shapes OS map references are stored in (letters as A, digits as 9)',
    answers:
      'What the map-reference parser for latitude and longitude must accept (DSFAAP-2890)'
  },
  'feature-geometry': {
    kind: 'scan',
    description:
      'FEATURE_GEOMETRY and SHAPE_FILE_ID population by feature type, with geometry sizes and shape-file-id shapes',
    answers:
      'Whether SAM holds geometry at all, and for which features (the geometry endpoint, question 6)'
  },
  'geometry-headers': {
    kind: 'scan',
    description:
      'The first five bytes of up to 1,000 stored geometries, grouped, with their sizes',
    answers:
      'What format the stored geometry is in (WKB, a shapefile record, Oracle SDO or something else)'
  },
  'feature-addresses': {
    kind: 'scan',
    description:
      'Locations and sub-locations by number of current addresses, with non-postal, ended and future-dated links',
    answers: 'addresses[] and the isPreferred selection rule'
  },
  'feature-involvements': {
    kind: 'scan',
    description:
      'FEATURE_INVOLVEMENT types with owner-of-place status, temporary-CPH indicator and last-checked dates',
    answers:
      'The owner-of-place literal for land owners (question 3) and holdership.temporaryCph'
  },
  'asset-involvements': {
    kind: 'scan',
    description:
      'ASSET_INVOLVEMENT types with keepership and ownership statuses',
    answers:
      'The keeper involvement types and their status code lists (question 4)'
  },
  'involvement-roles': {
    kind: 'scan',
    description:
      'Which party roles hold each current feature and asset involvement type',
    answers: 'Whether land owners and keepers are owners, agents or other roles'
  },
  'role-types': {
    kind: 'scan',
    description:
      'Every SAM role with its current party roles, split by party type',
    answers: 'The roles[].roleType code list and question 2'
  },
  'party-role-states': {
    kind: 'scan',
    description:
      'Current party-role status codes by role type (measure STATUS), and roles by number of current states (measure STATES_PER_ROLE)',
    answers:
      'The roles[].state code list, and whether it can be read without multiplying rows'
  },
  'party-relationships': {
    kind: 'scan',
    description:
      'Party and party-role relationship types, with the party type and role type at each end',
    answers:
      'Which relationship links a person to an organisation (relationships.organisations, question 7)'
  },
  'organisation-attributes': {
    kind: 'scan',
    description:
      'Organisations by type, organisational-unit type, head-office indicator and active status',
    answers:
      'organisationType, organisationalUnitType and headOffice, and how many Defra units there are (question 11)'
  },
  'contact-methods': {
    kind: 'scan',
    description:
      'Current contact links by medium, telecom type, address-usage type, preferred flag and party or role level',
    answers: 'contactMethods, the usageType code list, and question 8'
  },
  'contact-multiplicity': {
    kind: 'scan',
    description:
      'Parties by number of current telecom entries of each type, counting party-level and role-level links together',
    answers:
      'Whether a party can have several phone numbers or email addresses of one type, and how many'
  },
  'party-id-formats': {
    kind: 'scan',
    description:
      'The shapes of SAM customer ids by party type (first character kept, other letters as A, digits as 9)',
    answers: "Whether the API's id pattern fits every customer id (question 1)"
  }
})

export const HPAI_DISCOVERY_DATASET_KEYS = Object.freeze(
  Object.keys(HPAI_DISCOVERY_DATASETS)
)

const sqlByDataset = Object.fromEntries(
  HPAI_DISCOVERY_DATASET_KEYS.map((key) => [
    key,
    loadSQL(import.meta.filename, `.${key}.sql`)
  ])
)

/**
 * Accepts `dataset=a,b`, `dataset=a&dataset=b` or a mix, and normalises them
 * to a de-duplicated list of known dataset names.
 */
export const HpaiDiscoveryDatasetsSchema = Joi.alternatives()
  .try(Joi.array().items(Joi.string()), Joi.string())
  .custom((value, helpers) => {
    const names = [value]
      .flat()
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter(Boolean)

    const unknown = names.filter(
      (name) => !HPAI_DISCOVERY_DATASET_KEYS.includes(name)
    )

    if (unknown.length > 0) {
      return helpers.message({
        custom: `"dataset" has unknown value(s): ${unknown.join(', ')}. Call without "dataset" to list the valid ones`
      })
    }

    return [...new Set(names)]
  })
  .description(
    'One or more dataset names, comma-separated or repeated. Omit to list the datasets'
  )

/** Per-dataset call timeout. Raised above the pool's default for this probe only. */
export const PER_DATASET_TIMEOUT_MS = 20_000

/** Total time one request may spend running datasets before skipping the rest. */
export const REQUEST_BUDGET_MS = 40_000

/**
 * @param {string} dataset
 * @returns {{ sql: string; bindings: Record<string, unknown> }}
 */
export function hpaiDiscoveryQuery(dataset) {
  const sql = sqlByDataset[dataset]

  if (!sql) {
    throw new Error(`Unknown HPAI discovery dataset: ${dataset}`)
  }

  return { sql, bindings: {} }
}

/**
 * @typedef {{ code: string, message: string }} DatasetError
 * @typedef {DatasetDefinition & {
 *   dataset: string,
 *   rowCount: number,
 *   durationMs: number,
 *   rows: Array<Record<string, unknown>>,
 *   error: DatasetError | null
 * }} DatasetResult
 */

/**
 * The Oracle or driver error code and the first line of its message (the
 * line that names the problem, e.g. "ORA-00942: table or view does not
 * exist"), so a missing table, missing column or timeout is distinguishable
 * in the response. Messages describe schema objects, never row data.
 *
 * @param {unknown} error
 * @returns {DatasetError}
 */
export function describeDatasetError(error) {
  const { code, message } =
    /** @type {{ code?: unknown, message?: unknown }} */ (error ?? {})

  return {
    code: typeof code === 'string' && code ? code : 'UNKNOWN',
    message: String(message ?? error)
      .split('\n')[0]
      .slice(0, 300)
  }
}

/**
 * Runs the requested datasets one after another on one connection. Each gets
 * its own call timeout, capped by what is left of the request budget; a
 * dataset that fails or times out is reported with its error and the rest
 * still run. Datasets reached after the budget is spent are skipped.
 *
 * The raised call timeout does not leak into other requests: the oracledb
 * plugin sets `callTimeout` on every connection it hands out.
 *
 * `callTimeout` bounds each round trip to the database, not the whole
 * statement, so the per-dataset limit is approximate for queries that return
 * many rows in several fetches. Every dataset here aggregates, so its rows
 * arrive in one or two round trips.
 *
 * Pass `startedAt` when the request has already spent time (waiting for a
 * pool connection, for example) so the budget counts from the request start.
 *
 * @param {import('oracledb').Connection} connection
 * @param {string[]} datasets
 * @param {{ perDatasetTimeoutMs?: number, budgetMs?: number, startedAt?: number, now?: () => number }} [options]
 * @returns {Promise<DatasetResult[]>}
 */
export async function runHpaiDiscovery(connection, datasets, options = {}) {
  const {
    perDatasetTimeoutMs = PER_DATASET_TIMEOUT_MS,
    budgetMs = REQUEST_BUDGET_MS,
    now = Date.now,
    startedAt = now()
  } = options

  /** @type {DatasetResult[]} */
  const results = []

  for (const dataset of datasets) {
    const definition = HPAI_DISCOVERY_DATASETS[dataset]
    const remainingMs = budgetMs - (now() - startedAt)

    if (remainingMs <= 0) {
      results.push({
        dataset,
        ...definition,
        rowCount: 0,
        durationMs: 0,
        rows: [],
        error: {
          code: 'SKIPPED',
          message:
            'The request time budget was used up by earlier datasets; request this dataset on its own'
        }
      })

      continue
    }

    connection.callTimeout = Math.min(perDatasetTimeoutMs, remainingMs)

    const datasetStartedAt = now()

    try {
      const rows = await execute(connection, hpaiDiscoveryQuery(dataset))

      results.push({
        dataset,
        ...definition,
        rowCount: rows.length,
        durationMs: now() - datasetStartedAt,
        rows,
        error: null
      })
    } catch (error) {
      results.push({
        dataset,
        ...definition,
        rowCount: 0,
        durationMs: now() - datasetStartedAt,
        rows: [],
        error: describeDatasetError(error)
      })
    }
  }

  return results
}
