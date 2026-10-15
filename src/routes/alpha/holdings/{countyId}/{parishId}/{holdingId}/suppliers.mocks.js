const supplier1 = {
  type: 'suppliers',
  id: 'C1049182',
  supplierTypes: ['OVPRACTICE'],
  partyType: 'ORGANISATION',
  title: null,
  firstName: null,
  lastName: null,
  organisationName: 'Wheelwright Veterinary Group'
}

const supplier2 = {
  type: 'suppliers',
  id: 'C1031007',
  supplierTypes: ['DELIVERYPARTNER'],
  partyType: 'ORGANISATION',
  title: null,
  firstName: null,
  lastName: null,
  organisationName: 'Midlands Veterinary Delivery Partnership'
}

// Both CPHs held at L97339 share its flock, U000010.
const suppliersOfL97339 = [
  {
    ...supplier1,
    involvements: [
      {
        involvementType: 'OVFOR',
        locationId: 'L97339',
        livestockUnitId: 'U000010',
        from: '2019-05-01'
      }
    ]
  },
  {
    ...supplier2,
    involvements: [
      {
        involvementType: 'DPFOR',
        locationId: 'L97339',
        livestockUnitId: 'U000010',
        from: '2022-01-01'
      }
    ]
  }
]

export const holdingSuppliers = {
  '12/345/6789': suppliersOfL97339,
  '08/139/0167': suppliersOfL97339,
  '33/210/0455': [
    {
      ...supplier1,
      involvements: [
        {
          involvementType: 'OVFOR',
          locationId: 'L104588',
          livestockUnitId: 'U000420',
          from: '2014-10-01'
        }
      ]
    }
  ],
  '21/087/0042': []
}
