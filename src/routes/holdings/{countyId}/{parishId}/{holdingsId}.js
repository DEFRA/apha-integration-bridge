import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

const __dirname = new URL('.', import.meta.url).pathname

export const options = {
  tags: ['api', 'holdings'],
  description: 'Get holdings...',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), '{holdingsId}.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'list' // refer to notes above
    }
  },
  validate: {
    params: Joi.object({
      countyId: Joi.string().required().description('County ID'),
      parishId: Joi.string().required().description('Parish ID'),
      holdingsId: Joi.string().required().description('Holdings ID')
    }),
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.integration-bridge.v1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true })
  }
}

export const handler = (request, h) => {
  const { countyId, parishId, holdingsId } = request.params

  return h
    .response({
      message: 'success',
      version: request.pre.apiVersion,
      countyId,
      parishId,
      holdingsId
    })
    .code(200)
}
