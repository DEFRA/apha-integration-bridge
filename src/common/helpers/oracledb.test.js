import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterAll
} from '@jest/globals'
import Hapi from '@hapi/hapi'

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

const ORIGINAL_HTTP_PROXY = process.env.HTTP_PROXY

const poolConfig = (overrides = {}) => ({
  username: 'user',
  password: 'secret',
  host: 'db.example.com:1521',
  dbname: 'SERVICE',
  poolMax: 1,
  poolTimeout: 60,
  poolCloseWaitTime: 0,
  poolPingInterval: 60,
  expireTime: 1,
  ...overrides
})

const njs047 = () =>
  Object.assign(new Error('NJS-047: pool not found'), { code: 'NJS-047' })

const stubLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
})

/**
 * Mirrors the driver's pool lifecycle: getPool throws NJS-047 until
 * createPool has registered the alias, then returns a closable stub.
 */
const stubDriver = () => {
  /** @type {Map<string, { close: jest.Mock }>} */
  const pools = new Map()

  mockGetPool.mockImplementation((key) => {
    const pool = pools.get(key)

    if (!pool) {
      throw njs047()
    }

    return pool
  })

  mockCreatePool.mockImplementation(async ({ poolAlias }) => {
    const pool = { close: jest.fn(async () => {}) }

    pools.set(poolAlias, pool)

    return pool
  })

  return pools
}

/**
 * The module under test reads config (including httpProxy) at module scope,
 * so it is imported dynamically after each jest.resetModules — process.env
 * changes made by a test are honoured by the fresh import.
 *
 * @param {Record<string, ReturnType<typeof poolConfig>>} oracledbConfigurations
 */
const buildServer = async (oracledbConfigurations) => {
  const { oracleDb } = await import('./oracledb.js')

  const server = Hapi.server({ port: 0 })
  const decorate = /** @type {any} */ (server.decorate.bind(server))
  decorate('server', 'logger', stubLogger(), { override: true })

  await server.register({
    plugin: oracleDb.plugin,
    options: { oracledbConfigurations }
  })

  return server
}

describe('#oracleDb', () => {
  beforeEach(() => {
    jest.resetModules()

    mockGetPool.mockReset()
    mockCreatePool.mockReset()
    mockGetConnection.mockReset()

    delete process.env.HTTP_PROXY
  })

  afterAll(() => {
    if (ORIGINAL_HTTP_PROXY !== undefined) {
      process.env.HTTP_PROXY = ORIGINAL_HTTP_PROXY
    }
  })

  test('creates a pool per configuration with the expected attributes', async () => {
    stubDriver()

    const server = await buildServer({
      pega: poolConfig(),
      sam: poolConfig({ dbname: 'SAMDB' })
    })

    expect(mockCreatePool).toHaveBeenCalledTimes(2)

    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'user',
        password: 'secret',
        connectString: 'db.example.com:1521/SERVICE',
        poolAlias: 'pega',
        poolMin: 0,
        poolMax: 1,
        poolTimeout: 60,
        poolPingInterval: 60,
        expireTime: 1
      })
    )

    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectString: 'db.example.com:1521/SAMDB',
        poolAlias: 'sam'
      })
    )

    // no proxy configured — no proxy attributes on the pool
    expect(mockCreatePool.mock.calls[0][0]).not.toHaveProperty('httpsProxy')

    // the attributes debug log never includes the password
    const [debugContext] = /** @type {jest.Mock} */ (
      /** @type {any} */ (server.logger.debug)
    ).mock.calls.find(([, message]) =>
      String(message).includes('Creating OracleDB pool')
    )

    expect(debugContext.poolAttributes).not.toHaveProperty('password')
  })

  test('applies HTTP_PROXY attributes to every pool, including plain-TCP connect strings', async () => {
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'

    stubDriver()

    await buildServer({ pega: poolConfig() })

    expect(mockCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({
        httpsProxy: 'proxy.internal',
        httpsProxyPort: 3128
      })
    )
  })

  test('reuses an existing pool instead of creating a new one', async () => {
    const pools = stubDriver()

    pools.set('pega', { close: jest.fn(async () => {}) })

    await buildServer({ pega: poolConfig() })

    expect(mockCreatePool).not.toHaveBeenCalled()
  })

  test('retries pool creation on transient failure', async () => {
    stubDriver()

    mockCreatePool.mockImplementationOnce(async () => {
      throw new Error('transient')
    })

    const server = await buildServer({ pega: poolConfig() })

    expect(mockCreatePool).toHaveBeenCalledTimes(2)

    expect(server.logger.warn).toHaveBeenCalledWith(
      'Retrying to create OracleDB pool "pega"...'
    )
  })

  test('rejects registration when pool creation keeps failing', async () => {
    stubDriver()

    mockCreatePool.mockImplementation(async () => {
      throw new Error('permanent')
    })

    await expect(buildServer({ pega: poolConfig() })).rejects.toThrow(
      'permanent'
    )
  })

  test('decorates the server with an acquire function that yields a disposable connection', async () => {
    stubDriver()

    const connection = { close: jest.fn(async () => {}) }

    mockGetConnection.mockResolvedValue(connection)

    const server = await buildServer({ pega: poolConfig() })

    const acquire = /** @type {any} */ (server)['oracledb.pega']

    const handle = await acquire()

    expect(mockGetConnection).toHaveBeenCalledWith('pega')
    expect(handle.connection).toBe(connection)

    await handle[Symbol.asyncDispose]()

    expect(connection.close).toHaveBeenCalled()
  })

  test('closes each pool with its poolCloseWaitTime when the server stops', async () => {
    const pools = stubDriver()

    const server = await buildServer({
      pega: poolConfig({ poolCloseWaitTime: 5 })
    })

    await server.start()
    await server.stop()

    expect(pools.get('pega')?.close).toHaveBeenCalledWith(5)
  })
})
