import {
  jest,
  describe,
  beforeAll,
  afterAll,
  test,
  expect
} from '@jest/globals'
import hapi from '@hapi/hapi'

import { getConfiguration } from '../../test/oracledb.js'

const mockLoggerInfo = jest.fn()
const mockLoggerError = jest.fn()

const mockHapiLoggerInfo = jest.fn()
const mockHapiLoggerError = jest.fn()

jest.mock('hapi-pino', () => ({
  register: (server) => {
    server.decorate('server', 'logger', {
      trace: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: mockHapiLoggerInfo,
      error: mockHapiLoggerError
    })
  },
  name: 'mock-hapi-pino'
}))

jest.mock('./logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

jest.setTimeout(30_000)

describe('#startServer', () => {
  const PROCESS_ENV = process.env
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport

  beforeAll(async () => {
    const oracledbConfig = await getConfiguration()

    process.env = {
      ...PROCESS_ENV,
      ORACLEDB_PEGA_HOST: oracledbConfig.host,
      ORACLEDB_SAM_HOST: oracledbConfig.host
    }

    process.env.PORT = '3098' // Set to obscure port to avoid conflicts

    createServerImport = await import('../../server.js')
    startServerImport = await import('./start-server.js')

    createServerSpy = jest.spyOn(createServerImport, 'createServer')
    hapiServerSpy = jest.spyOn(hapi, 'server')
  })

  afterAll(() => {
    process.env = PROCESS_ENV
  })

  describe('When server starts', () => {
    let server

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      server = await startServerImport.startServer()

      expect(createServerSpy).toHaveBeenCalled()

      expect(hapiServerSpy).toHaveBeenCalled()

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Custom secure context is disabled'
      )

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith('Setting up MongoDb')

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'MongoDb connected to apha-integration-bridge'
      )

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        expect.stringMatching(/oracledb pool created for.+pega/i)
      )

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        expect.stringMatching(/oracledb pool created for.+sam/i)
      )

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Server started successfully'
      )

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Access your backend on http://localhost:3098'
      )
    })
  })

  describe('When server start fails', () => {
    beforeAll(() => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))
    })

    test('Should log failed startup message', async () => {
      await startServerImport.startServer()

      expect(mockLoggerInfo).toHaveBeenCalledWith('Server failed to start :(')
      expect(mockLoggerError).toHaveBeenCalledWith(
        Error('Server failed to start')
      )
    })
  })
})
