import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals'
import Hapi from '@hapi/hapi'

import { config } from '../../config.js'
import { oracleDbHealthcheck } from './oracledb-healthcheck.js'

const mockStatusRecord = jest.fn()
const mockDurationRecord = jest.fn()

jest.mock('../../lib/telemetry/index.js', () => ({
  meter: {
    createGauge: (name) => ({
      record: (...args) => {
        if (name === 'oracledb.healthcheck.status') mockStatusRecord(...args)
        else mockDurationRecord(...args)
      }
    })
  }
}))

/**
 * @param {(sql: string) => Promise<unknown>} execute
 */
const connectionStub = (execute) => ({
  connection: { callTimeout: 0, execute },
  [Symbol.asyncDispose]: async () => {}
})

const tick = () => new Promise((resolve) => setImmediate(resolve))

/** @param {number} ms */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const stubLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
})

const okExecute = () => jest.fn(async () => /** @type {unknown[]} */ ([]))

/**
 * @param {{
 *   pega?: jest.Mock,
 *   sam?: jest.Mock
 * }} [overrides]
 */
const buildServer = async ({
  pega = jest.fn(async () => connectionStub(okExecute())),
  sam = jest.fn(async () => connectionStub(okExecute()))
} = {}) => {
  const server = Hapi.server({ port: 0 })
  const decorate = /** @type {any} */ (server.decorate.bind(server))
  decorate('server', 'logger', stubLogger(), { override: true })
  decorate('server', 'oracledb.pega', pega)
  decorate('server', 'oracledb.sam', sam)
  await server.register(oracleDbHealthcheck)
  return server
}

describe('#oracleDbHealthcheck', () => {
  beforeEach(() => {
    config.set('oracledbHealthcheck.enabled', true)
    config.set('oracledbHealthcheck.intervalMs', 60)
    config.set('oracledbHealthcheck.timeoutMs', 40)
  })

  afterEach(() => {
    config.set('oracledbHealthcheck.enabled', false)
  })

  test('records SUCCESS and duration for each configured pool', async () => {
    const execute = okExecute()
    const pega = jest.fn(async () => connectionStub(execute))
    const sam = jest.fn(async () => connectionStub(execute))

    const server = await buildServer({ pega, sam })
    await server.start()
    await tick()
    await tick()

    expect(execute).toHaveBeenCalledWith('SELECT 1 FROM DUAL')
    expect(mockStatusRecord).toHaveBeenCalledWith(1, { connectionPool: 'pega' })
    expect(mockStatusRecord).toHaveBeenCalledWith(1, { connectionPool: 'sam' })
    expect(mockDurationRecord).toHaveBeenCalledWith(expect.any(Number), {
      connectionPool: 'pega'
    })

    await server.stop()
  })

  test('records FAIL and logs a warning when the probe throws', async () => {
    const err = new Error('ORA-boom')
    const pega = jest.fn(async () => {
      throw err
    })

    const server = await buildServer({ pega })
    const warn = jest.spyOn(server.logger, 'warn').mockImplementation(() => {})

    await server.start()
    await tick()
    await tick()

    expect(mockStatusRecord).toHaveBeenCalledWith(0, { connectionPool: 'pega' })
    expect(warn).toHaveBeenCalledWith(
      { err, pool: 'pega' },
      'OracleDB healthcheck failed'
    )

    await server.stop()
  })

  test('records FAIL when the probe exceeds timeoutMs', async () => {
    const execute = jest.fn(() => new Promise(() => {}))
    const pega = jest.fn(async () => connectionStub(execute))

    const server = await buildServer({ pega })
    await server.start()
    await wait(80)

    expect(mockStatusRecord).toHaveBeenCalledWith(0, { connectionPool: 'pega' })

    await server.stop()
  })

  test('does nothing when disabled', async () => {
    config.set('oracledbHealthcheck.enabled', false)

    const pega = jest.fn()
    const sam = jest.fn()
    const server = await buildServer({ pega, sam })

    await server.start()
    await wait(50)

    expect(pega).not.toHaveBeenCalled()
    expect(sam).not.toHaveBeenCalled()
    expect(mockStatusRecord).not.toHaveBeenCalled()

    await server.stop()
  })

  test('stops probing once the server shuts down', async () => {
    const execute = okExecute()
    const pega = jest.fn(async () => connectionStub(execute))
    const sam = jest.fn(async () => connectionStub(execute))

    const server = await buildServer({ pega, sam })
    await server.start()
    await tick()
    await tick()

    await server.stop()
    const callsAtStop = pega.mock.calls.length
    await wait(150)

    expect(pega.mock.calls.length).toBe(callsAtStop)
  })
})
