import fs from 'node:fs'
import path from 'node:path'

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: false
}

const html = fs.readFileSync(
  path.join(decodeURIComponent(__dirname), 'documentation.get.html'),
  'utf8'
)

export const handler = (_request, h) => h.response(html).type('text/html')
