import { afterEach, describe, expect, jest, test } from '@jest/globals'

import * as workAreaMappingModule from './get-workarea-code-mapping.js'
import * as speciesMappingModule from './get-purpose-species-code-mapping.js'
import * as customerTypesModule from './get-customer-types.js'
import { getWorkorderMappings } from './workorders.js'

describe('getWorkorderMappings', () => {
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

  test('skips null codes and only looks up what is left', async () => {
    workAreaMappingSpy.mockResolvedValue([])
    customerTypesSpy.mockResolvedValue(new Map())

    await getWorkorderMappings(/** @type {any} */ ({}), [
      { work_area: 'TB', purpose_species: null, customer_id: 'C001' },
      { work_area: null, purpose_species: null, customer_id: null },
      { work_area: 'TB', purpose_species: null, customer_id: 'C001' }
    ])

    expect(workAreaMappingSpy).toHaveBeenCalledWith(expect.anything(), ['TB'])
    expect(customerTypesSpy).toHaveBeenCalledWith(expect.anything(), ['C001'])
    expect(speciesMappingSpy).not.toHaveBeenCalled()
  })

  test('does not look anything up when every code is null', async () => {
    const mappings = await getWorkorderMappings(/** @type {any} */ ({}), [
      { work_area: null, purpose_species: null, customer_id: null }
    ])

    expect(workAreaMappingSpy).not.toHaveBeenCalled()
    expect(speciesMappingSpy).not.toHaveBeenCalled()
    expect(customerTypesSpy).not.toHaveBeenCalled()
    expect(mappings).toEqual({
      workAreaMapping: [],
      speciesMapping: [],
      customerTypeMapping: new Map()
    })
  })
})
