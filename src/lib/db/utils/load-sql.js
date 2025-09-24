import { existsSync, readFileSync } from 'node:fs'
import { parse, format } from 'node:path'

export const loadSQL = (filepath, ext = '.sql') => {
  const parsed = parse(filepath)

  const base = parsed.base.replace(parsed.ext, ext)

  const sqlFilepath = format({ ...parsed, base, ext })

  if (!existsSync(sqlFilepath)) {
    throw new Error(`Accompanying SQL file not found: ${sqlFilepath}`)
  }

  return readFileSync(sqlFilepath, 'utf8')
}
