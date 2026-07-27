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
        else if (name === 'oracledb.healthcheck.duration') {
          mockDurationRecord(...args)
        }
      }
    })
  }
}))

/**
 * @param {(sql: string) => Promise<unknown>} execute
 * @param {{ callTimeout?: number, onDispose?: jest.Mock }} [options]
 */
const connectionStub = (execute, { callTimeout = 0, onDispose } = {}) => {
  const connection = { callTimeout, execute }
  return {
    connection,
    [Symbol.asyncDispose]: async () => {
      onDispose?.(connection.callTimeout)
    }
  }
}

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
    jest.clearAllMocks()
    config.set('oracledbHealthcheck.enabled', true)
    config.set('oracledbHealthcheck.intervalMs', 60)
    config.set('oracledbHealthcheck.timeoutMs', 40)
    // keep the derived drain/TTL bounds small and deterministic for tests
    for (const pool of ['pega', 'sam']) {
      config.set(`oracledb.${pool}.connectTimeout`, 1)
      config.set(`oracledb.${pool}.transportConnectTimeout`, 1)
      config.set(`oracledb.${pool}.retryCount`, 0)
      config.set(`oracledb.${pool}.queueTimeoutMs`, 1000)
      config.set(`oracledb.${pool}.poolCloseWaitTime`, 0)
    }
    config.set('ecsStopTimeoutMs', 30_000)
  })

  afterEach(() => {
    config.set('oracledbHealthcheck.enabled', false)
    jest.restoreAllMocks()
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

  test('records FAIL and logs an error-coded warning when the probe throws', async () => {
    const err = Object.assign(new Error('could not be established'), {
      code: 'NJS-503'
    })
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
      expect.objectContaining({
        err,
        code: 'NJS-503',
        pool: 'pega',
        elapsedMs: expect.any(Number)
      }),
      'OracleDB healthcheck failed'
    )

    await server.stop()
  })

  test('a probe exceeding timeoutMs records FAIL with the stable app timeout code', async () => {
    const execute = jest.fn(() => new Promise(() => {}))
    const pega = jest.fn(async () => connectionStub(execute))

    const server = await buildServer({ pega })
    await server.start()
    await wait(80)

    expect(mockStatusRecord).toHaveBeenCalledWith(0, { connectionPool: 'pega' })
    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(
        ([context, message]) =>
          message === 'OracleDB healthcheck failed' &&
          context?.code === 'APP_HEALTHCHECK_TIMEOUT'
      )
    ).toBe(true)

    await server.stop()
  })

  test('an unsettled acquire gates later ticks: skips record status 0 with NO duration point and no new acquire', async () => {
    // acquire never settles — the underlying map entry never clears
    const pega = jest.fn(() => new Promise(() => {}))

    const server = await buildServer({ pega })
    await server.start()

    // first probe starts (1 acquire), then several intervals pass
    await wait(300)

    expect(pega).toHaveBeenCalledTimes(1)

    // skip ticks recorded failures without duration points: more status-0
    // records than duration records for the pool
    const statusZeroes = mockStatusRecord.mock.calls.filter(
      ([value, labels]) => value === 0 && labels.connectionPool === 'pega'
    ).length
    const durations = mockDurationRecord.mock.calls.filter(
      ([, labels]) => labels.connectionPool === 'pega'
    ).length
    expect(statusZeroes).toBeGreaterThan(durations)

    // rate-limited skip warning fired
    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(([, message]) =>
        String(message).includes('previous probe has not settled')
      )
    ).toBe(true)

    await server.stop()
  })

  test('a stuck pool does not affect the other pool (per-pool independence)', async () => {
    const pega = jest.fn(() => new Promise(() => {}))
    const samExecute = okExecute()
    const sam = jest.fn(async () => connectionStub(samExecute))

    const server = await buildServer({ pega, sam })
    await server.start()
    await wait(200)

    expect(pega).toHaveBeenCalledTimes(1)
    expect(sam.mock.calls.length).toBeGreaterThan(1)
    expect(mockStatusRecord).toHaveBeenCalledWith(1, { connectionPool: 'sam' })

    await server.stop()
  })

  test('recovery: once the underlying work settles, the next tick probes again and can go green', async () => {
    /** @type {(handle: any) => void} */
    let releaseAcquire
    const pega = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseAcquire = resolve
          })
      )
      .mockImplementation(async () => connectionStub(okExecute()))

    const server = await buildServer({ pega })
    await server.start()
    await wait(150)

    // gate held: still only the first acquire
    expect(pega).toHaveBeenCalledTimes(1)

    // outage ends: the hung acquire settles (handle disposed by the probe)
    releaseAcquire(connectionStub(okExecute()))
    await wait(150)

    expect(pega.mock.calls.length).toBeGreaterThan(1)
    expect(mockStatusRecord).toHaveBeenCalledWith(1, { connectionPool: 'pega' })

    await server.stop()
  })

  test('late-settling probe: exact callTimeout restored, disposed once, actual driver code logged, no unhandledRejection', async () => {
    const onDispose = jest.fn()
    /** @type {(value: any) => void} */
    let releaseAcquire
    const handle = connectionStub(okExecute(), {
      callTimeout: 1234,
      onDispose
    })
    const pega = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseAcquire = resolve
          })
      )
      .mockImplementation(async () => connectionStub(okExecute()))

    const unhandled = jest.fn()
    process.once('unhandledRejection', unhandled)

    const server = await buildServer({ pega })
    await server.start()

    // the raced probe times out (40ms) long before the acquire settles
    await wait(120)
    expect(mockStatusRecord).toHaveBeenCalledWith(0, { connectionPool: 'pega' })

    // the acquire settles late with a healthy handle — the IIFE completes:
    // executes, restores callTimeout, disposes exactly once
    releaseAcquire(handle)
    await wait(50)

    expect(onDispose).toHaveBeenCalledTimes(1)
    // disposal observed the RESTORED callTimeout (1234), not the probe's 40
    expect(onDispose).toHaveBeenCalledWith(1234)
    expect(unhandled).not.toHaveBeenCalled()

    process.removeListener('unhandledRejection', unhandled)
    await server.stop()
  })

  test('late-REJECTING probe logs the actual driver code without an unhandledRejection', async () => {
    /** @type {(err: any) => void} */
    let rejectAcquire
    const pega = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectAcquire = reject
          })
      )
      .mockImplementation(async () => connectionStub(okExecute()))

    const unhandled = jest.fn()
    process.once('unhandledRejection', unhandled)

    const server = await buildServer({ pega })
    await server.start()
    await wait(120)

    rejectAcquire(
      Object.assign(new Error('logon denied'), { code: 'ORA-01017' })
    )
    await wait(50)

    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(
        ([context, message]) =>
          String(message).includes('abandoned probe settled with an error') &&
          context?.code === 'ORA-01017'
      )
    ).toBe(true)
    expect(unhandled).not.toHaveBeenCalled()

    process.removeListener('unhandledRejection', unhandled)
    await server.stop()
  })

  test('the un-wedge TTL allows a rate-limited bypass probe when work never settles', async () => {
    const pega = jest.fn(() => new Promise(() => {}))

    // shrink derived TTL indirectly: mock Date.now to leap forward so the
    // unsettled work's age crosses the TTL without real waiting
    const realNow = Date.now.bind(Date)
    let offsetMs = 0
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + offsetMs)

    const server = await buildServer({ pega })
    await server.start()
    await wait(150)
    expect(pega).toHaveBeenCalledTimes(1)

    // leap past the TTL (5 × drainDeadline; drain here = 2000ms → TTL 10s)
    offsetMs = 60_000
    await wait(150)

    expect(pega).toHaveBeenCalledTimes(2)
    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    const bypassLog = errors.find(([, message]) =>
      String(message).includes('un-wedge TTL')
    )
    expect(bypassLog).toBeDefined()
    // the wedged work is tracked as an orphan, reported in the bypass log
    expect(bypassLog?.[0]?.orphanCount).toBe(1)

    // and only ONE bypass per TTL window: further ticks skip again
    await wait(150)
    expect(pega).toHaveBeenCalledTimes(2)

    await server.stop()
  })

  test('a fast-settling bypass reopens the gate; the wedged orphan stays drained and bounded', async () => {
    // A wedges forever; the TTL bypass B settles promptly (driver bounds
    // working again) — the gate must reopen for NORMAL settling probes,
    // while A remains tracked as an orphan and stop() stays bounded.
    const pega = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {})) // A: wedged
      .mockImplementation(async () => connectionStub(okExecute())) // B, C…: settle

    const realNow = Date.now.bind(Date)
    let offsetMs = 0
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + offsetMs)

    const server = await buildServer({ pega })
    await server.start()
    await wait(150)
    expect(pega).toHaveBeenCalledTimes(1) // gated behind A

    offsetMs = 60_000 // cross the TTL → bypass B fires and settles green
    await wait(150)
    expect(pega.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(mockStatusRecord).toHaveBeenCalledWith(1, { connectionPool: 'pega' })

    // gate reopened: normal probing continues (each probe settles)
    const callsAfterBypass = pega.mock.calls.length
    await wait(150)
    expect(pega.mock.calls.length).toBeGreaterThan(callsAfterBypass)

    // stop remains bounded despite A never settling (drained via orphans)
    const started = realNow()
    await server.stop()
    expect(realNow() - started).toBeLessThan(4_000)
  })

  test('a late resolution whose disposal THROWS is logged without an unhandledRejection', async () => {
    /** @type {(value: any) => void} */
    let releaseAcquire
    const explodingHandle = {
      connection: { callTimeout: 0, execute: okExecute() },
      [Symbol.asyncDispose]: async () => {
        throw Object.assign(new Error('pool already closed'), {
          code: 'NJS-065'
        })
      }
    }
    const pega = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseAcquire = resolve
          })
      )
      .mockImplementation(async () => connectionStub(okExecute()))

    const unhandled = jest.fn()
    process.once('unhandledRejection', unhandled)

    const server = await buildServer({ pega })
    await server.start()
    await wait(120) // raced probe timed out; work abandoned

    // the acquire settles late and its disposal throws (e.g. pool closed)
    releaseAcquire(explodingHandle)
    await wait(50)

    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(
        ([context, message]) =>
          String(message).includes('abandoned probe settled with an error') &&
          context?.code === 'NJS-065'
      )
    ).toBe(true)
    expect(unhandled).not.toHaveBeenCalled()

    process.removeListener('unhandledRejection', unhandled)
    await server.stop()
  })

  test('a probe settling AFTER server.stop() still logs its code without an unhandledRejection', async () => {
    /** @type {(err: any) => void} */
    let rejectAcquire
    const pega = jest.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectAcquire = reject
        })
    )

    const unhandled = jest.fn()
    process.once('unhandledRejection', unhandled)

    const server = await buildServer({ pega })
    await server.start()
    await wait(100) // raced probe timed out; work abandoned and unsettled

    // shutdown completes first (drain deadline expires past the hung work)
    await server.stop()

    // the abandoned work settles only AFTER the server has fully stopped
    rejectAcquire(
      Object.assign(new Error('closed during shutdown'), { code: 'NJS-500' })
    )
    await wait(50)

    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(
        ([context, message]) =>
          String(message).includes('abandoned probe settled with an error') &&
          context?.code === 'NJS-500'
      )
    ).toBe(true)
    expect(unhandled).not.toHaveBeenCalled()

    process.removeListener('unhandledRejection', unhandled)
  })

  test('server.stop() completes within the drain deadline despite a never-settling acquire', async () => {
    const pega = jest.fn(() => new Promise(() => {}))

    const server = await buildServer({ pega })
    await server.start()
    await wait(100)

    const started = Date.now()
    await server.stop()

    // drain deadline derived from test config ≈ 2000ms; must not hang
    expect(Date.now() - started).toBeLessThan(4_000)

    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(([, message]) =>
        String(message).includes('shutdown drain deadline expired')
      )
    ).toBe(true)
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
