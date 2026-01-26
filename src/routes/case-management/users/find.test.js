import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'
import hapiPino from 'hapi-pino'

import * as route from './find.js'

const ENDPOINT_PATH = '/case-management/users/find'
const ENDPOINT_METHOD = 'POST'

async function createTestServer() {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    }
  ])

  server.route({
    handler: route.default.handler,
    options: route.default.options,
    path: ENDPOINT_PATH,
    method: ENDPOINT_METHOD
  })

  return server
}

/**
 * @param {Hapi.Server} server
 * @param {string} emailAddress
 * @param {Record<string, string>} [headers]
 */
async function findUser(server, emailAddress, headers = {}) {
  return server.inject({
    method: ENDPOINT_METHOD,
    url: ENDPOINT_PATH,
    headers,
    payload: { emailAddress }
  })
}

/**
 * @param {Hapi.ServerInjectResponse} response
 * @param {number} expectedDataLength
 */
function assertSuccessResponse(response, expectedDataLength) {
  expect(response.statusCode).toBe(200)

  const body = /** @type {Record<string, any>} */ (response.result)

  expect(body.data).toBeInstanceOf(Array)
  expect(body.data.length).toBe(expectedDataLength)
  expect(body.links).toHaveProperty('self', 'case-management/users/find')

  return body
}

/**
 * @param {Record<string, any>} userData
 */
function assertUserData(userData) {
  expect(userData).toHaveProperty('type', 'case-management-user')
  expect(userData).toHaveProperty('id')
  expect(userData.id).toBeTruthy()
  expect(typeof userData.id).toBe('string')
}

describe('POST /case-management/users/find', () => {
  describe('Successful user lookup', () => {
    test('returns user when email exists in Salesforce', async () => {
      const server = await createTestServer()

      const res = await findUser(server, 'aphadev.mehboob.alam@defra.gov.uk')

      const body = assertSuccessResponse(res, 1)
      assertUserData(body.data[0])
    })

    test('email validation is case-insensitive', async () => {
      const server = await createTestServer()

      const res = await findUser(server, 'APHADEV.MEHBOOB.ALAM@DEFRA.GOV.UK')

      const body = assertSuccessResponse(res, 1)
      assertUserData(body.data[0])
    })

    test('returns correct response structure for existing user', async () => {
      const server = await createTestServer()

      const res = await findUser(server, 'aphadev.mehboob.alam@defra.gov.uk')

      const body = assertSuccessResponse(res, 1)
      assertUserData(body.data[0])
    })
  })

  describe('User not found', () => {
    test('returns empty data array when user does not exist', async () => {
      const server = await createTestServer()

      const res = await findUser(server, 'nonexistent.user@example.com')

      assertSuccessResponse(res, 0)
    })

    test('returns empty array for non-existent user', async () => {
      const server = await createTestServer()

      const res = await findUser(server, 'does.not.exist@nowhere.com')

      assertSuccessResponse(res, 0)
    })
  })

  describe('Email validation', () => {
    test('returns 400 for invalid email format', async () => {
      const server = await createTestServer()

      const res = await findUser(server, '12321adsa')

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        message: 'Your request could not be processed',
        code: 'BAD_REQUEST',
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: 'emailAddress provided is not in a valid format'
          }
        ]
      })
    })

    test('returns 400 for missing emailAddress field', async () => {
      const server = await createTestServer()

      const res = await server.inject({
        method: ENDPOINT_METHOD,
        url: ENDPOINT_PATH,
        payload: {}
      })

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)
    })
  })
})
