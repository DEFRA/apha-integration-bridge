import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { execute } from '../operations/execute.js'
import { getWorkAreaCodeMapping } from './get-workarea-code-mapping.js'
import { getPurposeSpeciesCodeMapping } from './get-purpose-species-code-mapping.js'
import { getCustomerTypes } from './get-customer-types.js'
import { findWorkorders, findWorkordersQuery } from './find-workorders.js'

// Mock the query/operation modules so the mapping tests can control their
// return values. A `jest.spyOn(import * as ns, fn)` does NOT reliably intercept
// the calls made by find-workorders.js: under babel's interop the spy targets
// the `import *` namespace object while the query module reads the raw module
// export, so the spy silently no-ops and the real implementation is hit. A
// module-factory mock replaces the module for every importer. The default
// delegates to the real implementation; individual tests override per call.
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

describe('findWorkordersQuery', () => {
  test('returns the expected query for valid parameters', () => {
    const ids = ['WS-12345']

    const { sql } = findWorkordersQuery(ids)

    expect(sql).toMatchSnapshot()
  })

  test('uses a single ws_entities CTE scan for work schedule entities', () => {
    const ids = ['WS-12345']

    const { sql } = findWorkordersQuery(ids)

    expect(sql).toContain('requested_workorders AS (')
    expect(sql).toContain('ws_entities AS (')
    expect(sql.match(/index_ac_wsentities wsl/g)?.length).toBe(1)
  })

  test('returns the expected query for multiple ids', () => {
    const ids = ['WS-12345', 'WS-12346']

    const { sql } = findWorkordersQuery(ids)

    expect(sql).toMatchSnapshot()
  })

  test('throws when ids is empty', () => {
    expect(() => findWorkordersQuery([])).toThrow('Invalid parameters')
  })

  test('throws when ids contain invalid characters', () => {
    expect(() => findWorkordersQuery(["WS-12345' OR '1'='1"])).toThrow(
      'Invalid parameters'
    )
  })
})

describe('findWorkorders', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('does not call mapping functions when no rows are returned', async () => {
    jest.mocked(execute).mockResolvedValueOnce([])

    const result = await findWorkorders(/** @type {any} */ ({}), ['WS-12345'])

    expect(getWorkAreaCodeMapping).not.toHaveBeenCalled()
    expect(getPurposeSpeciesCodeMapping).not.toHaveBeenCalled()
    expect(getCustomerTypes).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  test('calls work area, species, and customer type mapping functions when rows are returned', async () => {
    const row = {
      work_order_id: 'WS-12345',
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

    jest.mocked(execute).mockResolvedValueOnce([row])
    jest.mocked(getWorkAreaCodeMapping).mockResolvedValueOnce([])
    jest.mocked(getPurposeSpeciesCodeMapping).mockResolvedValueOnce([])
    jest.mocked(getCustomerTypes).mockResolvedValueOnce(new Map())

    await findWorkorders(/** @type {any} */ ({ samdb: {} }), ['WS-12345'])

    expect(getWorkAreaCodeMapping).toHaveBeenCalledWith(expect.anything(), [
      'TB'
    ])
    expect(getPurposeSpeciesCodeMapping).toHaveBeenCalledWith(
      expect.anything(),
      ['CTT']
    )
    expect(getCustomerTypes).toHaveBeenCalledWith(expect.anything(), ['C001'])
  })

  test('returns workorders mapped using resolved work area, species, and customer type descriptions', async () => {
    const row = {
      work_order_id: 'WS-12345',
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

    jest.mocked(execute).mockResolvedValueOnce([row])
    jest
      .mocked(getWorkAreaCodeMapping)
      .mockResolvedValueOnce([
        { work_area_code: 'TB', work_area_desc: 'Tuberculosis' }
      ])
    jest
      .mocked(getPurposeSpeciesCodeMapping)
      .mockResolvedValueOnce([
        { purpose_species_code: 'CTT', purpose_species_desc: 'Cattle' }
      ])
    jest
      .mocked(getCustomerTypes)
      .mockResolvedValueOnce(new Map([['C001', 'ORGANISATION']]))

    const result = await findWorkorders(/** @type {any} */ ({ samdb: {} }), [
      'WS-12345'
    ])

    expect(result).toHaveLength(1)
    expect(result[0].workArea).toBe('Tuberculosis')
    expect(result[0].species).toBe('Cattle')
    expect(result[0].relationships.customerOrOrganisation).toEqual({
      data: { type: 'organisations', id: 'C001' }
    })
  })
})
