export const first = {
  type: 'workorders',
  id: 'WS-76512',
  status: 'Open',
  startDate: '2024-01-01T09:00:00+00:00',
  activationDate: '2024-01-05T08:30:00+00:00',
  purpose: 'Initiate Incident Premises Spread Tracing Action',
  workArea: 'Tuberculosis',
  country: 'SCOTLAND',
  businessArea: 'Endemic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Endemic Disease',
  latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
  phase: 'EXPOSURETRACKING',
  relationships: {
    customer: {
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
    }
    // commodity: {
    //   data: {
    //     type: 'commodities',
    //     id: 'U000010'
    //   }
    // }
  }
}

export const second = {
  type: 'workorders',
  id: 'WS-76513',
  status: 'Open',
  startDate: '2024-01-03T09:00:00+00:00',
  activationDate: '2024-01-06T08:30:00+00:00',
  purpose: 'Initiate Incident Premises Spread Tracing Action',
  workArea: 'Tuberculosis',
  country: 'SCOTLAND',
  businessArea: 'Endemic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Endemic Disease',
  latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
  phase: 'EXPOSURETRACKING',
  relationships: {
    customer: {
      data: {
        type: 'customers',
        id: 'C123457'
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
    }
    // facility: {
    //   data: {
    //     type: 'facilities',
    //     id: 'U000030',
    //   }
    // },
    // activities: {
    //   data: {
    //     type: 'activities',
    //     id: 'test',
    //   }
    // }
  }
}

export const all = [first, second]
