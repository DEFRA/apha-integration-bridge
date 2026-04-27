import fs from 'node:fs'
import path from 'node:path'

import { config } from '../../config.js'

/**
 * Reads a markdown documentation file and replaces known config placeholders
 * with their current values from application configuration.
 *
 * Supported placeholders:
 * - `{{PAGINATION_MAX_PAGE_SIZE}}` — replaced with `pagination.maxPageSize`
 *
 * @param {string} directory - The directory containing the markdown file (typically `import.meta.url` resolved pathname)
 * @param {string} filename - The markdown filename to read (e.g. `'find.md'`)
 * @returns {string} The documentation string with placeholders replaced
 */
export function loadDocumentation(directory, filename) {
  const maxPageSize = config.get('pagination.maxPageSize')

  let documentation = fs.readFileSync(
    path.join(decodeURIComponent(directory), filename),
    'utf8'
  )

  documentation = documentation.replace(
    /{{PAGINATION_MAX_PAGE_SIZE}}/g,
    String(maxPageSize)
  )

  return documentation
}
