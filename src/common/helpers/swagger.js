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
        description:
          'Check if a county parish holding (CPH) number exists in Sam and get basic information about the holding.',
        externalDocs: {
          description: 'Find about more about this endpoint',
          url: 'https://example.com/holdings'
        }
      }
    ],
    grouping: 'tags',
    sortEndpoints: 'ordered'
  }
}
