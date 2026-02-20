import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicPath = path.resolve(__dirname, '../../../public')

const handler = {
  directory: {
    path: publicPath,
    listing: false,
    index: false
  }
}

const options = {
  auth: false,
  description: 'Serves static files (e.g., cognito-auth.js)'
}

export default {
  method: 'GET',
  handler,
  options
}
