export const workorder1 = {
  type: 'workorders',
  id: 'WS-76512',
  // status: 'Open',
  earliestActivityStartDate: '2024-01-01T09:00:00+00:00',
  activationDate: '2024-01-05T08:30:00+00:00',
  purpose: 'Initiate Incident Premises Spread Tracing Action',
  workArea: 'Tuberculosis',
  country: 'England',
  businessArea: 'Endemic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Endemic Disease',
  species: 'Cattle',
  // latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
  phase: 'EXPOSURETRACKING',
  activities: [],
  relationships: {
    customerOrOrganisation: {
      data: {
        type: 'customers',
        id: 'C123456'
      }
    },
    holding: {
      data: {
        type: 'holdings',
        id: '08/139/0167'
      }
    },
    location: {
      data: {
        type: 'locations',
        id: 'L123456'
      }
    },
    livestockUnits: {
      data: [
        {
          type: 'animal-commodities',
          id: 'U000012'
        }
      ]
    },
    facilities: {
      data: []
    }
  }
}

export const workorder2 = {
  type: 'workorders',
  id: 'WS-76513',
  // status: 'Open',
  earliestActivityStartDate: '2024-01-03T09:00:00+00:00',
  activationDate: '2024-01-06T08:30:00+00:00',
  purpose: 'Initiate Incident Premises Spread Tracing Action',
  workArea: 'Tuberculosis',
  country: 'Scotland',
  businessArea: 'Endemic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Endemic Disease',
  species: 'Sheep',
  // latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
  phase: 'EXPOSURETRACKING',
  activities: [
    {
      type: 'activities',
      id: 'activity-1',
      activityName: 'Arrange Visit',
      sequenceNumber: 1,
      default: true,
      performActivity: true,
      workbasket: 'Tech'
    },
    {
      type: 'activities',
      id: 'activity-2',
      activityName: 'Perform TB Skin Test',
      sequenceNumber: 2,
      default: false,
      performActivity: true,
      workbasket: 'Vet'
    }
  ],
  relationships: {
    customerOrOrganisation: {
      data: {
        type: 'organisations',
        id: 'O123456'
      }
    },
    holding: {
      data: {
        type: 'holdings',
        id: '08/139/0168'
      }
    },
    location: {
      data: {
        type: 'locations',
        id: 'L123457'
      }
    },
    livestockUnits: {
      data: []
    },
    facilities: {
      data: [
        {
          type: 'facilities',
          id: 'U000030'
        }
      ]
    }
  }
}

export const workorders = [workorder1, workorder2]
