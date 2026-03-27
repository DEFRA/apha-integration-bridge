import { afterEach, describe, expect, jest, test } from '@jest/globals'

import * as dbOperations from '../operations/execute.js'
import * as workAreaMappingModule from './get-workarea-code-mapping.js'
import * as speciesMappingModule from './get-purpose-species-code-mapping.js'
import * as customerTypesModule from './get-customer-types.js'
import { findWorkorders, findWorkordersQuery } from './find-workorders.js'

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
  const executeSpy = jest.spyOn(dbOperations, 'execute')
  const workAreaMappingSpy = jest.spyOn(
    workAreaMappingModule,
    'getWorkAreaCodeMapping'
  )
  const speciesMappingSpy = jest.spyOn(
    speciesMappingModule,
    'getPurposeSpeciesCodeMapping'
  )
  const customerTypesSpy = jest.spyOn(customerTypesModule, 'getCustomerTypes')

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('does not call mapping functions when no rows are returned', async () => {
    executeSpy.mockResolvedValue([])

    const result = await findWorkorders(/** @type {any} */ ({}), ['WS-12345'])

    expect(workAreaMappingSpy).not.toHaveBeenCalled()
    expect(speciesMappingSpy).not.toHaveBeenCalled()
    expect(customerTypesSpy).not.toHaveBeenCalled()
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

    executeSpy.mockResolvedValue([row])
    workAreaMappingSpy.mockResolvedValue([])
    speciesMappingSpy.mockResolvedValue([])
    customerTypesSpy.mockResolvedValue(new Map())

    await findWorkorders(/** @type {any} */ ({ samdb: {} }), ['WS-12345'])

    expect(workAreaMappingSpy).toHaveBeenCalledWith(expect.anything(), ['TB'])
    expect(speciesMappingSpy).toHaveBeenCalledWith(expect.anything(), ['CTT'])
    expect(customerTypesSpy).toHaveBeenCalledWith(expect.anything(), ['C001'])
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

    executeSpy.mockResolvedValue([row])
    workAreaMappingSpy.mockResolvedValue([
      { work_area_code: 'TB', work_area_desc: 'Tuberculosis' }
    ])
    speciesMappingSpy.mockResolvedValue([
      { purpose_species_code: 'CTT', purpose_species_desc: 'Cattle' }
    ])
    customerTypesSpy.mockResolvedValue(new Map([['C001', 'ORGANISATION']]))

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
