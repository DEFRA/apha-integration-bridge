import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'

import { loadClients } from './load.js'

describe('loadClients', () => {
  /** @type {string} */
  let dir

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'clients-config-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  /**
   * @param {string} contents
   */
  const writeConfig = (contents) => {
    const filePath = path.join(dir, 'clients.jsonc')

    writeFileSync(filePath, contents)

    return filePath
  }

  test('parses a valid config', () => {
    const filePath = writeConfig(
      JSON.stringify({
        wfm: { client_ids: ['abc', 'def'], scopes: ['pii'] }
      })
    )

    expect(loadClients(filePath)).toEqual({
      wfm: { client_ids: ['abc', 'def'], scopes: ['pii'] }
    })
  })

  test('parses an empty object', () => {
    const filePath = writeConfig('{}')

    expect(loadClients(filePath)).toEqual({})
  })

  test('strips a top-level $schema property so it is not treated as a client entry', () => {
    const filePath = writeConfig(
      JSON.stringify({
        $schema: './clients.schema.json',
        wfm: { client_ids: ['abc'], scopes: ['pii'] }
      })
    )

    expect(loadClients(filePath)).toEqual({
      wfm: { client_ids: ['abc'], scopes: ['pii'] }
    })
  })

  test('parses a config with comments and a trailing comma', () => {
    const filePath = writeConfig(`{
      // wfm gets unmasked PII access
      "wfm": {
        "client_ids": [
          "abc", // dev
          "def", // prod
        ],
        "scopes": ["pii"]
      }
    }`)

    expect(loadClients(filePath)).toEqual({
      wfm: { client_ids: ['abc', 'def'], scopes: ['pii'] }
    })
  })

  test('throws when the file is missing', () => {
    expect(() => loadClients(path.join(dir, 'missing.jsonc'))).toThrow(
      /Failed to read clients config/
    )
  })

  test('throws when the file is not valid JSONC', () => {
    const filePath = writeConfig('{ not json')

    expect(() => loadClients(filePath)).toThrow(
      /Failed to parse clients config/
    )
  })

  test('throws when an entry is missing client_ids', () => {
    const filePath = writeConfig(JSON.stringify({ wfm: { scopes: ['pii'] } }))

    expect(() => loadClients(filePath)).toThrow(/Invalid clients config/)
  })

  test('throws when an entry is missing scopes', () => {
    const filePath = writeConfig(
      JSON.stringify({ wfm: { client_ids: ['abc'] } })
    )

    expect(() => loadClients(filePath)).toThrow(/Invalid clients config/)
  })

  test('throws when client_ids contains a non-string', () => {
    const filePath = writeConfig(
      JSON.stringify({ wfm: { client_ids: ['abc', 42], scopes: ['pii'] } })
    )

    expect(() => loadClients(filePath)).toThrow(/Invalid clients config/)
  })

  test('throws when an entry has unknown keys', () => {
    const filePath = writeConfig(
      JSON.stringify({
        wfm: { client_ids: ['abc'], scopes: ['pii'], extra: true }
      })
    )

    expect(() => loadClients(filePath)).toThrow(/Invalid clients config/)
  })
})
