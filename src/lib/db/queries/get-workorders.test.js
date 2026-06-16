import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'
import oracledb from 'oracledb'

import { config } from '../../../config.js'
import { execute } from '../operations/execute.js'
import { getWorkAreaCodeMapping } from './get-workarea-code-mapping.js'
import { getPurposeSpeciesCodeMapping } from './get-purpose-species-code-mapping.js'
import { getCustomerTypes } from './get-customer-types.js'
import { getWorkorders, getWorkordersQuery } from './get-workorders.js'

// Mock the spied modules so per-test overrides reliably intercept the calls
// made by get-workorders.js. A `jest.spyOn(import * as ns, fn)` does NOT
// reliably intercept under babel's interop: the spy targets the `import *`
// namespace object while the SUT reads the raw module export, so the spy
// silently no-ops and the real implementation (and DB) is hit. A
// module-factory mock replaces the module for every importer. The default
// delegates to the real implementation so the seeded-DB integration tests
// above are unaffected; individual tests override per call.
jest.mock('../operations/execute.js', () => {
  const actual = jest.requireActual('../operations/execute.js')
  return {
    __esModule: true,
    ...actual,
    execute: jest.fn((...args) => actual.execute(...args))
  }
})

jest.mock('./get-workarea-code-mapping.js', () => {
  const actual = jest.requireActual('./get-workarea-code-mapping.js')
  return {
    __esModule: true,
    ...actual,
    getWorkAreaCodeMapping: jest.fn((...args) =>
      actual.getWorkAreaCodeMapping(...args)
    )
  }
})

jest.mock('./get-purpose-species-code-mapping.js', () => {
  const actual = jest.requireActual('./get-purpose-species-code-mapping.js')
  return {
    __esModule: true,
    ...actual,
    getPurposeSpeciesCodeMapping: jest.fn((...args) =>
      actual.getPurposeSpeciesCodeMapping(...args)
    )
  }
})

jest.mock('./get-customer-types.js', () => {
  const actual = jest.requireActual('./get-customer-types.js')
  return {
    __esModule: true,
    ...actual,
    getCustomerTypes: jest.fn((...args) => actual.getCustomerTypes(...args))
  }
})

const validParams = {
  startActivationDate: '2024-01-01T00:00:00.000Z',
  endActivationDate: '2024-02-01T00:00:00.000Z',
  page: 1,
  pageSize: 10
}

describe('getWorkordersQuery', () => {
  test('returns the expected query for valid parameters', () => {
    const { sql } = getWorkordersQuery({
      ...validParams,
      endActivationDate: '2024-01-01T00:05:00.001Z'
    })

    expect(sql).toMatchSnapshot()
  })

  test('returns the expected query for update date filter', () => {
    const { sql } = getWorkordersQuery({
      startUpdatedDate: '2024-01-01T00:00:00.000Z',
      endUpdatedDate: '2024-01-01T00:05:00.001Z',
      page: 1,
      pageSize: 10
    })

    expect(sql).toMatchSnapshot()
  })

  test('returns the expected query with country filter', () => {
    const { sql } = getWorkordersQuery({
      ...validParams,
      endActivationDate: '2024-01-01T00:05:00.001Z',
      country: 'Wales'
    })

    expect(sql).toMatchSnapshot()
  })

  test('uses a single ws_entities CTE scan for work schedule entities', () => {
    const { sql } = getWorkordersQuery({
      ...validParams,
      endActivationDate: '2024-01-01T00:05:00.001Z'
    })

    expect(sql).toContain('ws_entities AS (')
    expect(sql).toContain('requested_workorders rw')
    expect(sql.match(/index_ac_wsentities wsl/g)?.length).toBe(1)
  })

  test('normalizes timezone-offset date strings before SQL timestamp comparison', () => {
    const { sql } = getWorkordersQuery({
      ...validParams,
      startActivationDate: '2024-01-01T00:00:00.000+01:00',
      endActivationDate: '2024-01-01T00:05:00.000+01:00'
    })

    expect(sql).toContain(
      "ac.wsactivationdate >= TO_TIMESTAMP('2023-12-31 23:00:00.000', 'yyyy-mm-dd hh24:mi:ss.ff3')"
    )
    expect(sql).toContain(
      "ac.wsactivationdate < TO_TIMESTAMP('2023-12-31 23:05:00.000', 'yyyy-mm-dd hh24:mi:ss.ff3')"
    )
  })

  test('includes all countries when country filter is omitted', () => {
    const { sql } = getWorkordersQuery({
      ...validParams
    })

    expect(sql).toContain('(NULL IS NULL OR UPPER(ws.purposecountry) = NULL)')
  })

  test('filters by specific country when provided', () => {
    const { sql } = getWorkordersQuery({
      ...validParams,
      country: 'wales'
    })

    expect(sql).toContain(
      "('WALES' IS NULL OR UPPER(ws.purposecountry) = 'WALES')"
    )
  })

  test('defaults page and pageSize when omitted', () => {
    const { sql } = getWorkordersQuery({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z'
    })

    expect(sql).toContain('row_num > 0')
    expect(sql).toContain('row_num <= 0 + 51')
  })
})

describe('getWorkorders', () => {
  /** @type {import('../../../types/connection.js').DBConnections} */
  let connections

  beforeAll(async () => {
    const samConfig = config.get('oracledb').sam
    const pegaConfig = config.get('oracledb').pega

    connections = {
      samdb: await oracledb.getConnection({
        user: samConfig.username,
        password: samConfig.password,
        connectString: `${samConfig.host}/${samConfig.dbname}`
      }),
      pegadb: await oracledb.getConnection({
        user: pegaConfig.username,
        password: pegaConfig.password,
        connectString: `${pegaConfig.host}/${pegaConfig.dbname}`
      })
    }
  })

  afterAll(async () => {
    await connections.samdb.close()
    await connections.pegadb.close()
  })

  test('returns page-limited workorders and hasMore when extra rows exist', async () => {
    const result = await getWorkorders(connections, {
      startActivationDate: '2014-05-01T00:00:00.000Z',
      endActivationDate: '2014-07-01T00:00:00.000Z',
      page: 1,
      pageSize: 1
    })

    expect(result.hasMore).toBe(true)
    expect(result.workorders).toHaveLength(1)
    expect(result.workorders[0].id).toBe('WS-43')
  })

  test('returns final page with hasMore false', async () => {
    const result = await getWorkorders(connections, {
      startActivationDate: '2014-05-01T00:00:00.000Z',
      endActivationDate: '2014-07-01T00:00:00.000Z',
      page: 3,
      pageSize: 1
    })

    expect(result.hasMore).toBe(false)
    expect(result.workorders).toHaveLength(1)
    expect(result.workorders[0].id).toBe('WS-1531')
  })

  describe('mapping work area, species, and customer types', () => {
    const executeSpy = jest.mocked(execute)
    const workAreaMappingSpy = jest.mocked(getWorkAreaCodeMapping)
    const speciesMappingSpy = jest.mocked(getPurposeSpeciesCodeMapping)
    const customerTypesSpy = jest.mocked(getCustomerTypes)

    afterEach(() => {
      // clearMocks:true clears call history each test, but these tests set
      // persistent mockResolvedValue overrides. Re-establish the delegating
      // defaults so any later test (or integration test) sees the real impl.
      executeSpy.mockImplementation((...args) =>
        jest.requireActual('../operations/execute.js').execute(...args)
      )
      workAreaMappingSpy.mockImplementation((...args) =>
        jest
          .requireActual('./get-workarea-code-mapping.js')
          .getWorkAreaCodeMapping(...args)
      )
      speciesMappingSpy.mockImplementation((...args) =>
        jest
          .requireActual('./get-purpose-species-code-mapping.js')
          .getPurposeSpeciesCodeMapping(...args)
      )
      customerTypesSpy.mockImplementation((...args) =>
        jest.requireActual('./get-customer-types.js').getCustomerTypes(...args)
      )
    })

    test('does not call mapping functions when no rows are returned', async () => {
      executeSpy.mockResolvedValue([])

      const result = await getWorkorders(/** @type {any} */ ({}), validParams)

      expect(workAreaMappingSpy).not.toHaveBeenCalled()
      expect(speciesMappingSpy).not.toHaveBeenCalled()
      expect(customerTypesSpy).not.toHaveBeenCalled()
      expect(result).toEqual({ hasMore: false, workorders: [] })
    })

    test('calls mapping functions with deduplicated work area, species and customer ids', async () => {
      const rows = [
        {
          work_order_id: 'WS-001',
          work_area: 'TB',
          purpose_species: 'CTT',
          customer_id: 'C001',
          wsactivationdate: null,
          business_area: null,
          country: null,
          aim: null,
          purpose: null,
          wsearliestactivitystartdate: null,
          phase: null,
          pxinsname: null,
          activitysequencenumber: null,
          entityid: null,
          pxindexpurpose: null,
          cphid: null
        },
        {
          work_order_id: 'WS-002',
          work_area: 'TB',
          purpose_species: 'CTT',
          customer_id: 'C001',
          wsactivationdate: null,
          business_area: null,
          country: null,
          aim: null,
          purpose: null,
          wsearliestactivitystartdate: null,
          phase: null,
          pxinsname: null,
          activitysequencenumber: null,
          entityid: null,
          pxindexpurpose: null,
          cphid: null
        }
      ]

      executeSpy.mockResolvedValue(rows)
      workAreaMappingSpy.mockResolvedValue([])
      speciesMappingSpy.mockResolvedValue([])
      customerTypesSpy.mockResolvedValue(new Map())

      await getWorkorders(/** @type {any} */ ({ samdb: {} }), validParams)

      expect(workAreaMappingSpy).toHaveBeenCalledWith(expect.anything(), ['TB'])
      expect(speciesMappingSpy).toHaveBeenCalledWith(expect.anything(), ['CTT'])
      expect(customerTypesSpy).toHaveBeenCalledWith(expect.anything(), ['C001'])
    })

    test('returns workorders mapped using resolved work area, species and customer type descriptions', async () => {
      const row = {
        work_order_id: 'WS-001',
        work_area: 'TB',
        purpose_species: 'CTT',
        customer_id: 'C001',
        wsactivationdate: null,
        business_area: null,
        country: null,
        aim: null,
        purpose: null,
        wsearliestactivitystartdate: null,
        phase: null,
        pxinsname: null,
        activitysequencenumber: null,
        entityid: null,
        pxindexpurpose: null,
        cphid: null
      }

      executeSpy.mockResolvedValue([row])
      workAreaMappingSpy.mockResolvedValue([
        { work_area_code: 'TB', work_area_desc: 'Tuberculosis' }
      ])
      speciesMappingSpy.mockResolvedValue([
        { purpose_species_code: 'CTT', purpose_species_desc: 'Cattle' }
      ])
      customerTypesSpy.mockResolvedValue(new Map([['C001', 'ORGANISATION']]))

      const result = await getWorkorders(
        /** @type {any} */ ({ samdb: {} }),
        validParams
      )

      expect(result.workorders).toHaveLength(1)
      expect(result.workorders[0].workArea).toBe('Tuberculosis')
      expect(result.workorders[0].species).toBe('Cattle')
      expect(result.workorders[0].relationships.customerOrOrganisation).toEqual(
        {
          data: { type: 'organisations', id: 'C001' }
        }
      )
    })
  })
})
