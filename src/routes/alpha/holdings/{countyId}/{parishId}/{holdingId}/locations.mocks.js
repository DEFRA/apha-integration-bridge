import {
  location3,
  location4,
  location5,
  location6
} from '../../../../locations/find.mocks.js'

export const holdingLocations = {
  '12/345/6789': [
    {
      ...location3,
      holdership: {
        vetnetCoreId: '4471023',
        from: '2019-04-02',
        cphType: 'PERMANENT',
        selected: true
      }
    }
  ],
  '08/139/0167': [
    {
      ...location3,
      holdership: {
        vetnetCoreId: '5500871',
        from: '2021-03-01',
        cphType: 'PERMANENT',
        selected: true
      }
    },
    {
      ...location4,
      holdership: {
        vetnetCoreId: '4102233',
        from: '2012-06-15',
        cphType: 'PERMANENT',
        selected: false
      }
    }
  ],
  '33/210/0455': [
    {
      ...location5,
      holdership: {
        vetnetCoreId: '6120458',
        from: '2014-09-01',
        cphType: 'PERMANENT',
        selected: true
      }
    }
  ],
  '21/087/0042': [
    {
      ...location6,
      holdership: {
        vetnetCoreId: '7034519',
        from: '2023-08-14',
        cphType: 'PERMANENT',
        selected: true
      }
    }
  ]
}
