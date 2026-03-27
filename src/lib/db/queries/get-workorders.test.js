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
import * as dbOperations from '../operations/execute.js'
import * as workAreaMappingModule from './get-workarea-code-mapping.js'
import * as speciesMappingModule from './get-purpose-species-code-mapping.js'
import { getWorkorders, getWorkordersQuery } from './get-workorders.js'

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

  test('defaults country filter to SCOTLAND in SQL', () => {
    const { sql } = getWorkordersQuery({
      ...validParams
    })

    expect(sql).toContain("UPPER(ws.purposecountry) = 'SCOTLAND'")
  })

  test('normalizes provided country to uppercase in SQL', () => {
    const { sql } = getWorkordersQuery({
      ...validParams,
      country: 'wales'
    })

    expect(sql).toContain("UPPER(ws.purposecountry) = 'WALES'")
  })

  test('throws if query parameters are invalid', () => {
    expect(() =>
      getWorkordersQuery({
        ...validParams,
        startActivationDate: 'not-a-date'
      })
    ).toThrow(/invalid parameters/i)
  })

  test('throws when endActivationDate is before startActivationDate', () => {
    expect(() =>
      getWorkordersQuery({
        ...validParams,
        startActivationDate: '2024-02-01T00:00:00.000Z',
        endActivationDate: '2024-01-01T00:00:00.000Z'
      })
    ).toThrow(/invalid parameters/i)
  })

  test('throws when endActivationDate is before startActivationDate', () => {
    expect(() =>
      getWorkordersQuery({
        ...validParams,
        startActivationDate: '2024-02-01T00:00:00.000Z',
        endActivationDate: '2024-01-01T00:00:00.000Z'
      })
    ).toThrow(/end activation date must be after start activation date/i)
  })

  test('throws when endActivationDate is equal to startActivationDate', () => {
    expect(() =>
      getWorkordersQuery({
        ...validParams,
        startActivationDate: '2024-01-01T00:00:00.000Z',
        endActivationDate: '2024-01-01T00:00:00.000Z'
      })
    ).toThrow(/end activation date must be after start activation date/i)
  })

  test('throws when page and pageSize are invalid', () => {
    expect(() =>
      getWorkordersQuery({
        ...validParams,
        page: 0,
        pageSize: 100
      })
    ).toThrow(/invalid parameters/i)
  })

  test('throws when country is not one of England, Wales, or Scotland', () => {
    expect(() =>
      getWorkordersQuery({
        ...validParams,
        country: 'Northern Ireland'
      })
    ).toThrow(/invalid parameters/i)
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

  describe('mapping work area and species codes', () => {
    const executeSpy = jest.spyOn(dbOperations, 'execute')
    const workAreaMappingSpy = jest.spyOn(
      workAreaMappingModule,
      'getWorkAreaCodeMapping'
    )
    const speciesMappingSpy = jest.spyOn(
      speciesMappingModule,
      'getPurposeSpeciesCodeMapping'
    )

    afterEach(() => {
      jest.resetAllMocks()
    })

    test('does not call mapping functions when no rows are returned', async () => {
      executeSpy.mockResolvedValue([])

      const result = await getWorkorders(/** @type {any} */ ({}), validParams)

      expect(workAreaMappingSpy).not.toHaveBeenCalled()
      expect(speciesMappingSpy).not.toHaveBeenCalled()
      expect(result).toEqual({ hasMore: false, workorders: [] })
    })

    test('calls mapping functions with deduplicated work area and species codes', async () => {
      const rows = [
        {
          work_order_id: 'WS-001',
          work_area: 'TB',
          purpose_species: 'CTT',
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

      await getWorkorders(/** @type {any} */ ({ samdb: {} }), validParams)

      expect(workAreaMappingSpy).toHaveBeenCalledWith(expect.anything(), ['TB'])
      expect(speciesMappingSpy).toHaveBeenCalledWith(expect.anything(), ['CTT'])
    })

    test('returns workorders mapped using resolved work area and species descriptions', async () => {
      const row = {
        work_order_id: 'WS-001',
        work_area: 'TB',
        purpose_species: 'CTT',
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

      const result = await getWorkorders(
        /** @type {any} */ ({ samdb: {} }),
        validParams
      )

      expect(result.workorders).toHaveLength(1)
      expect(result.workorders[0].workArea).toBe('Tuberculosis')
      expect(result.workorders[0].species).toBe('Cattle')
    })
  })
})
