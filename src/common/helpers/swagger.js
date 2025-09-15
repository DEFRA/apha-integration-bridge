import swagger from 'hapi-swagger'

const description = `
Welcome to the APH Integration Bridge API documentation. This API provides secure and modern access to various APH systems.

[Get support on our Slack channel](https://defra-digital-team.slack.com/archives/C095FKF6ETH)

[Find out more about this API](https://github.com/DEFRA/apha-api-documentation)
`

export const openApi = {
  plugin: swagger,
  options: {
    OAS: 'v3.0',
    info: {
      title: 'APHA Integration Bridge API',
      version: '0.0.0',
      description
    },
    tags: [
      {
        name: 'holdings',
        description:
          'Check if a county parish holding (CPH) number exists in Sam and get basic information about the holding.'
        // externalDocs: {
        //   description: 'Find out more about this endpoint',
        //   url: 'https://example.com/holdings'
        // }
      }
    ],
    securityDefinitions: {
      Bearer: {
        type: 'http',
        scheme: 'bearer',
        description:
          'To make authenticated requests to the APHA Integration API, you must have a valid **Cognito issued access token**.'
      }
    },
    grouping: 'tags',
    sortEndpoints: 'ordered'
  }
}
