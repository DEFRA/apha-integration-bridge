import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import Hapi from '@hapi/hapi'

import { config } from '../../config.js'
import {
  oracleDb,
  validateOracleDbConfigurations,
  parseHost,
  resolveProxy,
  classifyPreflightError
} from './oracledb.js'

const mockGetPool = jest.fn()
const mockCreatePool = jest.fn()
const mockGetConnection = jest.fn()

jest.mock('oracledb', () => ({
  __esModule: true,
  default: {
    getPool: (...args) => mockGetPool(...args),
    createPool: (...args) => mockCreatePool(...args),
    getConnection: (...args) => mockGetConnection(...args)
  }
}))

jest.mock('../../lib/telemetry/index.js', () => ({
  meter: {
    createGauge: () => ({ record: jest.fn() })
  }
}))

const VALIDATION_CONTEXT = {
  healthcheckTimeoutMs: 5_000,
  ecsStopTimeoutMs: 30_000
}

const poolConfig = (overrides = {}) => ({
  username: 'user',
  password: 'secret',
  host: 'db.example.com:1521',
  dbname: 'SERVICE',
  poolMin: 0,
  poolMax: 1,
  poolTimeout: 60,
  poolCloseWaitTime: 0,
  poolPingInterval: 60,
  expireTime: 1,
  connectTimeout: 10,
  transportConnectTimeout: 5,
  retryCount: 0,
  queueTimeoutMs: 10_000,
  queueMax: null,
  ...overrides
})

const njs047 = () => {
  const error = new Error('NJS-047: pool not found')
  error.code = 'NJS-047'
  return error
}

const oraError = (code, message = code) => {
  const error = new Error(message)
  error.code = code
  return error
}

const healthyConnection = () => ({
  callTimeout: 0,
  execute: jest.fn(async () => []),
  close: jest.fn(async () => {})
})

const stubLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
})

const buildServer = async (configurations, preflight) => {
  const server = Hapi.server({ port: 0 })
  const decorate = /** @type {any} */ (server.decorate.bind(server))
  decorate('server', 'logger', stubLogger(), { override: true })
  await server.register({
    plugin: oracleDb.plugin,
    options: {
      oracledbConfigurations: configurations,
      preflight: preflight ?? { retryWindowMs: 30, retryDelayMs: 10 }
    }
  })
  return server
}

describe('#validateOracleDbConfigurations', () => {
  test('accepts a plain configuration and derives queueMax', () => {
    const { pools, warnings } = validateOracleDbConfigurations(
      { pega: poolConfig({ poolMax: 4 }) },
      VALIDATION_CONTEXT
    )

    expect(pools[0].queueMax).toBe(25) // max(25, 2*4) = 25
    expect(pools[0].poolMin).toBe(0)
    expect(pools[0].connectString).toBe(
      'db.example.com:1521/SERVICE?connect_timeout=10&transport_connect_timeout=5&retry_count=0'
    )
    expect(warnings).toEqual([])
  })

  test('derived queueMax scales with poolMax and clamps at 500', () => {
    const scaled = validateOracleDbConfigurations(
      { pega: poolConfig({ poolMax: 40 }) },
      VALIDATION_CONTEXT
    )
    expect(scaled.pools[0].queueMax).toBe(80)

    // 2 * 300 = 600 → clamped to 500
    const clamped = validateOracleDbConfigurations(
      { pega: poolConfig({ poolMax: 300 }) },
      VALIDATION_CONTEXT
    )
    expect(clamped.pools[0].queueMax).toBe(500)
  })

  test('explicit queueMax always wins over the derived default, including 0', () => {
    const explicit = validateOracleDbConfigurations(
      { pega: poolConfig({ queueMax: 7 }) },
      VALIDATION_CONTEXT
    )
    expect(explicit.pools[0].queueMax).toBe(7)

    const zero = validateOracleDbConfigurations(
      { pega: poolConfig({ queueMax: 0 }) },
      VALIDATION_CONTEXT
    )
    expect(zero.pools[0].queueMax).toBe(0)
  })

  test('forces poolMin to 0 with a warning when configured above 0', () => {
    const { pools, warnings } = validateOracleDbConfigurations(
      { pega: poolConfig({ poolMin: 2, poolMax: 3 }) },
      VALIDATION_CONTEXT
    )

    expect(pools[0].poolMin).toBe(0)
    expect(warnings).toEqual([
      expect.stringContaining('poolMin=2 was overridden to 0')
    ])
  })

  test.each([
    ['descriptor host', { host: '(DESCRIPTION=(ADDRESS=x))' }],
    ['embedded query string', { host: 'db:1521?connect_timeout=1' }],
    ['whitespace dbname', { dbname: 'MY SERVICE' }],
    ['connectTimeout below range', { connectTimeout: 0 }],
    ['connectTimeout above range', { connectTimeout: 301 }],
    ['transport above connect', { transportConnectTimeout: 20 }],
    ['retryCount above range', { retryCount: 3 }],
    ['queueTimeoutMs zero', { queueTimeoutMs: 0 }],
    ['explicit queueMax above range', { queueMax: 501 }],
    ['poolMax zero', { poolMax: 0 }],
    ['poolMin above poolMax', { poolMin: 2, poolMax: 1 }],
    ['fractional poolTimeout', { poolTimeout: 1.5 }],
    ['poolCloseWaitTime above range', { poolCloseWaitTime: 11 }]
  ])('rejects %s', (_label, overrides) => {
    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig(overrides) },
        VALIDATION_CONTEXT
      )
    ).toThrow(/Invalid OracleDB configuration/)
  })

  test('allows negative poolPingInterval (driver disable sentinel)', () => {
    const { pools } = validateOracleDbConfigurations(
      { pega: poolConfig({ poolPingInterval: -1 }) },
      VALIDATION_CONTEXT
    )
    expect(pools[0].config.poolPingInterval).toBe(-1)
  })

  test('requires retryCount 0 for multi-host connect strings', () => {
    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig({ host: 'db1:1521,db2:1521', retryCount: 1 }) },
        VALIDATION_CONTEXT
      )
    ).toThrow(/retryCount must be 0 for multi-host/)

    // semicolon-separated address groups are multi-host too
    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig({ host: 'db1:1521;db2:1521', retryCount: 1 }) },
        VALIDATION_CONTEXT
      )
    ).toThrow(/retryCount must be 0 for multi-host/)

    const ok = validateOracleDbConfigurations(
      { pega: poolConfig({ host: 'db1:1521,db2:1521', retryCount: 0 }) },
      VALIDATION_CONTEXT
    )
    expect(ok.pools[0].addressCount).toBe(2)
  })

  test('an invalid proxy URL is fatal for TCPS pools and a warning for plain-TCP pools', () => {
    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig({ host: 'tcps://db:2484' }) },
        { ...VALIDATION_CONTEXT, proxyUrl: 'socks5://proxy:1080' }
      )
    ).toThrow(/unsupported scheme/)

    const plain = validateOracleDbConfigurations(
      { pega: poolConfig() },
      { ...VALIDATION_CONTEXT, proxyUrl: 'socks5://proxy:1080' }
    )
    expect(plain.warnings).toEqual([
      expect.stringContaining('ignored (no TCPS connect strings)')
    ])
  })

  test('ecsStopTimeoutMs outside its range is fatal', () => {
    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig() },
        { healthcheckTimeoutMs: 5_000, ecsStopTimeoutMs: 100 }
      )
    ).toThrow(/ecsStopTimeoutMs must be an integer between 10000 and 120000/)

    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig() },
        { healthcheckTimeoutMs: 5_000, ecsStopTimeoutMs: 10_000_000 }
      )
    ).toThrow(/ecsStopTimeoutMs/)
  })

  test('healthy-path shutdown budget infeasibility is fatal', () => {
    expect(() =>
      validateOracleDbConfigurations(
        { pega: poolConfig({ connectTimeout: 60, queueTimeoutMs: 60_000 }) },
        { healthcheckTimeoutMs: 5_000, ecsStopTimeoutMs: 30_000 }
      )
    ).toThrow(/shutdown budget infeasible/)
  })

  test('outage-amplified shutdown bound only warns', () => {
    const { warnings } = validateOracleDbConfigurations(
      {
        pega: poolConfig({
          host: 'db1:1521,db2:1521,db3:1521',
          connectTimeout: 10
        })
      },
      VALIDATION_CONTEXT
    )

    expect(warnings).toEqual([
      expect.stringContaining('outage-amplified shutdown bound')
    ])
  })

  test('validates every pool before reporting (multi-pool aggregate)', () => {
    expect(() =>
      validateOracleDbConfigurations(
        {
          pega: poolConfig({ connectTimeout: 0 }),
          sam: poolConfig({ queueTimeoutMs: 0 })
        },
        VALIDATION_CONTEXT
      )
    ).toThrow(/pega[\s\S]*sam/)
  })
})

describe('#parseHost', () => {
  test.each([
    ['db:1521', false, 1],
    ['tcps://db:2484', true, 1],
    ['TCPS://db:2484', true, 1],
    ['db1:1521,db2:1521', false, 2],
    ['db1:1521;db2:1521', false, 2],
    ['[::1]:1521', false, 1]
  ])('%s → tcps=%s addresses=%s', (host, tcps, addressCount) => {
    expect(parseHost(host)).toEqual({ tcps, addressCount })
  })
})

describe('#resolveProxy', () => {
  test('returns no attrs when no proxy is configured', () => {
    expect(resolveProxy(null, true)).toEqual({
      attrs: null,
      warning: null,
      invalid: null
    })
  })

  test('applies attrs for TCPS with a scheme-default port', () => {
    expect(resolveProxy('http://proxy.internal', true)).toEqual({
      attrs: { httpsProxy: 'proxy.internal', httpsProxyPort: 80 },
      warning: null,
      invalid: null
    })
    expect(resolveProxy('https://proxy.internal', true).attrs).toEqual({
      httpsProxy: 'proxy.internal',
      httpsProxyPort: 443
    })
  })

  test('omits attrs with a warning for plain-TCP connections', () => {
    const { attrs, warning, invalid } = resolveProxy(
      'http://proxy.internal:3128',
      false
    )
    expect(attrs).toBeNull()
    expect(warning).toMatch(/plain TCP/)
    expect(invalid).toBeNull()
  })

  test('marks unsupported schemes and malformed URLs as invalid', () => {
    expect(resolveProxy('socks5://proxy:1080', true).invalid).toMatch(
      /unsupported scheme/
    )
    expect(resolveProxy('not a url', true).invalid).toMatch(/not a valid URL/)
  })
})

describe('#classifyPreflightError', () => {
  test.each([
    ['ORA-01017', 'fatal'],
    ['ORA-01045', 'fatal'],
    ['ORA-28000', 'fatal'],
    ['NJS-518', 'unknown-service'],
    ['NJS-503', 'outage'],
    ['NJS-510', 'outage'],
    ['APP_PREFLIGHT_TIMEOUT', 'outage'],
    [undefined, 'outage']
  ])('%s → %s', (code, expected) => {
    expect(classifyPreflightError(code ? oraError(code) : new Error('x'))).toBe(
      expected
    )
  })
})

describe('#oracleDb plugin register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    config.set('httpProxy', null)
    // default: no pool exists yet → NJS-047 → createPool
    mockGetPool.mockImplementation(() => {
      throw njs047()
    })
    mockCreatePool.mockResolvedValue(undefined)
    mockGetConnection.mockImplementation(async () => healthyConnection())
  })

  test('creates pools with bounded attributes and preflights them', async () => {
    const server = await buildServer({ pega: poolConfig() })

    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectString:
          'db.example.com:1521/SERVICE?connect_timeout=10&transport_connect_timeout=5&retry_count=0',
        poolMin: 0,
        poolMax: 1,
        queueTimeout: 10_000,
        queueMax: 25,
        poolAlias: 'pega'
      })
    )

    // preflight ran and disposed its connection
    expect(mockGetConnection).toHaveBeenCalledWith('pega')

    await server.stop()
  })

  test('preflight restores callTimeout before closing the connection', async () => {
    const connection = healthyConnection()
    connection.callTimeout = 1234
    const observed = []
    connection.close = jest.fn(async () => {
      observed.push(connection.callTimeout)
    })
    mockGetConnection.mockResolvedValueOnce(connection)

    const server = await buildServer({ pega: poolConfig() })

    expect(observed).toEqual([1234])
    await server.stop()
  })

  test('preflight timeout boots red with APP_PREFLIGHT_TIMEOUT and the late connection is still disposed exactly once', async () => {
    // getConnection hangs past the (injected) preflight timeout, then
    // resolves late — the race loses, boot continues red, and the task must
    // still close the connection exactly once with no unhandledRejection.
    const connection = healthyConnection()
    let releaseAcquire
    mockGetConnection.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAcquire = () => resolve(connection)
        })
    )

    const unhandled = jest.fn()
    process.once('unhandledRejection', unhandled)

    const server = await buildServer(
      { pega: poolConfig() },
      { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 20 }
    )

    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(
      errors.some(
        ([context, message]) =>
          String(message).includes('born unreachable') &&
          context?.code === 'APP_PREFLIGHT_TIMEOUT'
      )
    ).toBe(true)

    // late resolution: the abandoned task completes and disposes exactly once
    releaseAcquire()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(connection.close).toHaveBeenCalledTimes(1)
    expect(unhandled).not.toHaveBeenCalled()

    process.removeListener('unhandledRejection', unhandled)
    await server.stop()
  })

  test('late REJECTION after the preflight race settles never becomes an unhandledRejection', async () => {
    let rejectAcquire
    mockGetConnection.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectAcquire = () => reject(oraError('NJS-503', 'late failure'))
        })
    )

    const unhandled = jest.fn()
    process.once('unhandledRejection', unhandled)

    const server = await buildServer(
      { pega: poolConfig() },
      { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 20 }
    )

    rejectAcquire()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(unhandled).not.toHaveBeenCalled()

    process.removeListener('unhandledRejection', unhandled)
    await server.stop()
  })

  test('a config-class error settling AFTER the preflight timeout is loudly logged', async () => {
    let rejectAcquire
    mockGetConnection.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectAcquire = () => reject(oraError('ORA-01017', 'logon denied'))
        })
    )

    const server = await buildServer(
      { pega: poolConfig() },
      { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 20 }
    )

    rejectAcquire()
    await new Promise((resolve) => setTimeout(resolve, 20))

    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(
      errors.some(([, message]) =>
        String(message).includes('CONFIGURATION-class error')
      )
    ).toBe(true)

    await server.stop()
  })

  test('preflight disposes exactly once and restores callTimeout when execute throws', async () => {
    const connection = healthyConnection()
    connection.callTimeout = 777
    connection.execute = jest.fn(async () => {
      throw oraError('ORA-00942', 'table or view does not exist')
    })
    const observed = []
    connection.close = jest.fn(async () => {
      observed.push(connection.callTimeout)
    })
    mockGetConnection.mockResolvedValueOnce(connection)

    // ORA-00942 is not in the fatal set → outage-class, boots red
    const server = await buildServer({ pega: poolConfig() })

    expect(connection.close).toHaveBeenCalledTimes(1)
    expect(observed).toEqual([777])

    await server.stop()
  })

  test('a DELAYED authentication error still classifies as fatal', async () => {
    // ORA-01017 arriving after transport establishment (per Codex r8) must
    // not be misread as an outage — the preflight timeout is the full
    // acquisition window, so the delayed rejection lands inside the race.
    mockGetConnection.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(oraError('ORA-01017', 'logon denied')), 30)
        })
    )

    await expect(
      buildServer(
        { pega: poolConfig() },
        { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 5_000 }
      )
    ).rejects.toThrow(/logon denied/)
  })

  test('the driver verdict wins the preflight race when it arrives before the app timer', async () => {
    // NJS-040 (driver queue timeout) fires at T=30ms; the injected app timer
    // sits above it at 100ms — classification must key on the driver's code,
    // never on APP_PREFLIGHT_TIMEOUT (the classification-ordering invariant).
    mockGetConnection.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(
            () => reject(oraError('NJS-040', 'connection request timeout')),
            30
          )
        })
    )

    const server = await buildServer(
      { pega: poolConfig() },
      { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 100 }
    )

    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    const unreachable = errors.find(([, message]) =>
      String(message).includes('born unreachable')
    )
    expect(unreachable?.[0]?.code).toBe('NJS-040')

    await server.stop()
  })

  test('a total outage delays boot by exactly one full attempt per pool (concurrent, no clamping)', async () => {
    mockGetConnection.mockImplementation(() => new Promise(() => {}))

    const started = Date.now()
    const server = await buildServer(
      { pega: poolConfig(), sam: poolConfig() },
      { retryWindowMs: 5_000, retryDelayMs: 10, timeoutMs: 300 }
    )

    const elapsed = Date.now() - started
    // one concurrent full attempt (~300ms), NOT one per pool sequentially,
    // and NOT the retry window
    expect(elapsed).toBeGreaterThanOrEqual(250)
    expect(elapsed).toBeLessThan(2_000)

    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(
      errors.filter(([, message]) =>
        String(message).includes('born unreachable')
      ).length
    ).toBe(2)

    await server.stop()
  })

  test('the budget caps a runaway NJS-518 retry tail (red-unverified, no unbounded loop)', async () => {
    mockGetConnection.mockRejectedValue(
      oraError('NJS-518', 'service not registered')
    )

    const started = Date.now()
    // huge retry window; tiny injected budget — the loop must stop at the
    // budget backstop and boot red-unverified instead of retrying for 60s.
    // (Under the DERIVED default budget the 518 window always fits, so
    // persistent-518 reaches its fatal path — covered by the earlier test.)
    const server = await buildServer(
      { pega: poolConfig() },
      {
        retryWindowMs: 60_000,
        retryDelayMs: 100,
        timeoutMs: 200,
        budgetMs: 700
      }
    )

    expect(Date.now() - started).toBeLessThan(3_000)
    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(
      errors.some(([, message]) =>
        String(message).includes('preflight budget exhausted')
      )
    ).toBe(true)

    await server.stop()
  })

  test('the budget backstop boots red-unverified when exhausted before an attempt can run', async () => {
    const server = await buildServer(
      { pega: poolConfig() },
      { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 400, budgetMs: 300 }
    )

    expect(mockGetConnection).not.toHaveBeenCalled()
    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(
      errors.some(([, message]) =>
        String(message).includes('preflight budget exhausted')
      )
    ).toBe(true)

    await server.stop()
  })

  test('a fatal preflight short-circuits without waiting for slower pools', async () => {
    let created = false
    const close = jest.fn(async () => {})
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close }
      throw njs047()
    })
    // pega fatals instantly; sam hangs well past the assertion window
    mockGetConnection.mockImplementation(async (key) => {
      if (key === 'pega') throw oraError('ORA-01017', 'logon denied')
      return new Promise(() => {})
    })

    const started = Date.now()
    await expect(
      buildServer(
        { pega: poolConfig(), sam: poolConfig() },
        { retryWindowMs: 30, retryDelayMs: 10, timeoutMs: 5_000 }
      )
    ).rejects.toThrow(/logon denied/)

    // must fail long before sam's 5s preflight timeout would settle
    expect(Date.now() - started).toBeLessThan(1_000)
    expect(close).toHaveBeenCalled()
  })

  test('a failed preflight leaves no stop listener behind', async () => {
    let created = false
    const close = jest.fn(async () => {})
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close }
      throw njs047()
    })
    mockGetConnection.mockRejectedValue(oraError('ORA-01017', 'logon denied'))

    const server = Hapi.server({ port: 0 })
    const decorate = /** @type {any} */ (server.decorate.bind(server))
    decorate('server', 'logger', stubLogger(), { override: true })

    await expect(
      server.register({
        plugin: oracleDb.plugin,
        options: {
          oracledbConfigurations: { pega: poolConfig() },
          preflight: { retryWindowMs: 30, retryDelayMs: 10 }
        }
      })
    ).rejects.toThrow(/logon denied/)

    // rollback already closed the pool during the failed register
    const closesAtAbort = close.mock.calls.length
    expect(closesAtAbort).toBeGreaterThan(0)

    // stopping the server must NOT re-trigger pool closing (no stop
    // listener was registered by the aborted plugin)
    await server.stop()
    expect(close.mock.calls.length).toBe(closesAtAbort)
  })

  test('invalid configuration aborts before any pool is created', async () => {
    await expect(
      buildServer({
        pega: poolConfig(),
        sam: poolConfig({ connectTimeout: 0 })
      })
    ).rejects.toThrow(/Invalid OracleDB configuration/)

    expect(mockCreatePool).not.toHaveBeenCalled()
  })

  test('a pool-creation failure closes already-created pools and aborts', async () => {
    const closeFirst = jest.fn(async () => {})
    mockCreatePool
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(oraError('NJS-007', 'invalid attribute'))
    // after pega is created, getPool('pega') must return a closable handle
    mockGetPool.mockImplementation((key) => {
      if (key === 'pega' && mockCreatePool.mock.calls.length > 0) {
        return { close: closeFirst }
      }
      throw njs047()
    })

    await expect(
      buildServer({ pega: poolConfig(), sam: poolConfig() })
    ).rejects.toThrow(/invalid attribute/)

    expect(closeFirst).toHaveBeenCalled()
  })

  test('fatal preflight (bad credentials) closes pools and fails startup', async () => {
    const close = jest.fn(async () => {})
    mockGetPool.mockImplementation(() => {
      throw njs047()
    })
    let created = false
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close }
      throw njs047()
    })
    mockGetConnection.mockRejectedValue(oraError('ORA-01017', 'logon denied'))

    await expect(buildServer({ pega: poolConfig() })).rejects.toThrow(
      /logon denied/
    )

    expect(close).toHaveBeenCalled()
  })

  test('unknown service (NJS-518) retries then fails startup when persistent', async () => {
    mockGetConnection.mockRejectedValue(
      oraError('NJS-518', 'service not registered')
    )

    await expect(
      buildServer(
        { pega: poolConfig() },
        { retryWindowMs: 40, retryDelayMs: 10 }
      )
    ).rejects.toThrow(/service not registered/)

    expect(mockGetConnection.mock.calls.length).toBeGreaterThan(1)
  })

  test('unknown service recovers within the retry window', async () => {
    mockGetConnection
      .mockRejectedValueOnce(oraError('NJS-518', 'service not registered'))
      .mockImplementation(async () => healthyConnection())

    const server = await buildServer(
      { pega: poolConfig() },
      { retryWindowMs: 5_000, retryDelayMs: 10 }
    )

    expect(mockGetConnection.mock.calls.length).toBeGreaterThan(1)
    await server.stop()
  })

  test('outage-class preflight failure boots red without throwing', async () => {
    mockGetConnection.mockRejectedValue(
      oraError('NJS-503', 'could not be established')
    )

    const server = await buildServer({ pega: poolConfig() })
    const logged = /** @type {jest.Mock} */ (server.logger.error).mock.calls

    expect(
      logged.some(([, message]) => String(message).includes('born unreachable'))
    ).toBe(true)

    // decoration exists — the pool is usable for later recovery
    expect(typeof (/** @type {any} */ (server)['oracledb.pega'])).toBe(
      'function'
    )

    await server.stop()
  })

  test('TCPS + proxy applies httpsProxy attributes; plain TCP omits with a warning', async () => {
    config.set('httpProxy', 'http://proxy.internal:3128')

    const server = await buildServer({
      pega: poolConfig({ host: 'tcps://db.example.com:2484' })
    })

    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({
        httpsProxy: 'proxy.internal',
        httpsProxyPort: 3128
      })
    )
    await server.stop()

    mockCreatePool.mockClear()
    mockGetPool.mockImplementation(() => {
      throw njs047()
    })

    const plain = await buildServer({ pega: poolConfig() })

    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.not.objectContaining({ httpsProxy: expect.anything() })
    )
    const warns = /** @type {jest.Mock} */ (plain.logger.warn).mock.calls
    expect(
      warns.some(([message]) => String(message).includes('plain TCP'))
    ).toBe(true)

    await plain.stop()
  })

  test('poolMin override warning is emitted at startup', async () => {
    const server = await buildServer({
      pega: poolConfig({ poolMin: 2, poolMax: 3 })
    })

    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(([message]) => String(message).includes('overridden to 0'))
    ).toBe(true)
    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({ poolMin: 0 })
    )

    await server.stop()
  })

  test('stop handler closes pools', async () => {
    const close = jest.fn(async () => {})
    let created = false
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close }
      throw njs047()
    })

    const server = await buildServer({ pega: poolConfig() })
    await server.stop()

    expect(close).toHaveBeenCalledWith(0)
    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(errors).toEqual([])
  })

  test('stop handler is quiet when the pool is already gone at stop time', async () => {
    let created = false
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close: jest.fn(async () => {}) }
      throw njs047()
    })

    const server = await buildServer({ pega: poolConfig() })

    // the pool vanishes (e.g. driver-level close) before the server stops —
    // the stop handler's getPool throws NJS-047 and must stay quiet
    created = false
    await server.stop()

    const errors = /** @type {jest.Mock} */ (server.logger.error).mock.calls
    expect(errors).toEqual([])
  })

  test('a hanging pool.close cannot hang rollback — bounded with a warn', async () => {
    let created = false
    const close = jest.fn(() => new Promise(() => {})) // never settles
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close }
      throw njs047()
    })
    mockGetConnection.mockRejectedValue(oraError('ORA-01017', 'logon denied'))

    const server = Hapi.server({ port: 0 })
    const decorate = /** @type {any} */ (server.decorate.bind(server))
    decorate('server', 'logger', stubLogger(), { override: true })

    const started = Date.now()
    await expect(
      server.register({
        plugin: oracleDb.plugin,
        options: {
          oracledbConfigurations: { pega: poolConfig() },
          preflight: { retryWindowMs: 30, retryDelayMs: 10 },
          shutdown: { closeMarginMs: 50 }
        }
      })
    ).rejects.toThrow(/logon denied/)

    // rollback returned despite the never-settling close, within the bound
    expect(Date.now() - started).toBeLessThan(2_000)
    const warns = /** @type {jest.Mock} */ (server.logger.warn).mock.calls
    expect(
      warns.some(([message]) => String(message).includes('close exceeded'))
    ).toBe(true)
  })

  test('pools close concurrently so shutdown cost is the max close wait, not the sum', async () => {
    let created = false
    /** @type {Array<() => void>} */
    const releases = []
    const close = jest.fn(
      () =>
        new Promise((resolve) => {
          releases.push(() => resolve(undefined))
        })
    )
    mockCreatePool.mockImplementation(async () => {
      created = true
    })
    mockGetPool.mockImplementation(() => {
      if (created) return { close }
      throw njs047()
    })

    const server = await buildServer({
      pega: poolConfig(),
      sam: poolConfig()
    })

    const stopping = server.stop()
    await new Promise((resolve) => setTimeout(resolve, 20))

    // both closes must be in flight simultaneously before either resolves
    expect(close).toHaveBeenCalledTimes(2)

    releases.forEach((release) => release())
    await stopping
  })
})
