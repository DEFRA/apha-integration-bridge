import swagger from 'hapi-swagger'

export const openApi = {
  plugin: swagger,
  options: {
    OAS: 'v3.0',
    info: {
      title: 'APHA Integration Bridge API',
      version: '0.0.0',
      description: 'API for the APHA Integration Bridge',
      contact: {
        name: 'APHA Integration Team',
        email: 'some-email@email.com'
      }
    },
    tags: [
      {
        name: 'holdings',
        description: 'Explanatory description of holdings operations',
        externalDocs: {
          description: 'Find out more about holdings',
          url: 'https://example.com/holdings'
        }
      }
    ],
    grouping: 'tags',
    sortEndpoints: 'ordered'
  }
}
