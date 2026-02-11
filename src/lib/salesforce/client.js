import { proxyFetch } from '../../common/helpers/proxy/proxy-fetch.js'
import { config } from '../../config.js'
import { HTTPMethods } from '../http/http-methods.js'
import { authenticateWithJWT } from './jwt-bearer.js'

/**
 * @import {CompositeResponse} from '../../types/salesforce/composite-response.js'
 * @import {CreateGuestResponse} from '../../types/salesforce/contact-response.js'
 * @import {Logger} from 'pino'
 */

const TOKEN_EXPIRY_BUFFER_MS = 5000

/**
 * Lightweight Salesforce client with in-memory token caching.
 * Supports both client credentials flow (system-level) and JWT Bearer flow (user-level).
 */
class SalesforceClient {
  cachedToken = null
  cachedInstanceUrl = null
  expiresAt = 0
  refreshPromise = null
  userTokenCache = new Map()

  /**
   * @returns {object} salesforce config
   */
  get cfg() {
    return config.get('salesforce')
  }

  /**
   * Resolve the base URL from config or the last token response.
   */
  resolveBaseUrl() {
    return this.cfg.baseUrl || this.cachedInstanceUrl
  }

  /**
   * Resolve the auth URL from config or by deriving it from baseUrl.
   */
  resolveAuthUrl() {
    if (this.cfg.authUrl) {
      return this.cfg.authUrl
    }

    const baseUrl = this.resolveBaseUrl()

    if (!baseUrl) {
      throw new Error('Salesforce base URL is not configured')
    }

    return `${baseUrl.replace(/\/$/, '')}/services/oauth2/token`
  }

  /**
   * @param {object} tokenResponse Salesforce token response with expires_in
   * @param {number} [defaultExpirySeconds=900] Default expiry in seconds (15 minutes)
   */
  calculateTokenExpiry(tokenResponse, defaultExpirySeconds = 900) {
    const expiresIn = Number.parseInt(tokenResponse.expires_in, 10)
    const expiresInMs = Number.isFinite(expiresIn)
      ? expiresIn * 1000
      : defaultExpirySeconds * 1000

    return Date.now() + expiresInMs
  }

  /**
   * @param {number} expiresAt Token expiry timestamp in milliseconds
   */
  isTokenValid(expiresAt) {
    return Date.now() < expiresAt - TOKEN_EXPIRY_BUFFER_MS
  }

  /**
   * Acquire a bearer token for a specific user using JWT Bearer flow.
   * Tokens are cached per-user until shortly before expiry.
   * @param {string} userEmail
   * @param {import('pino').Logger} [logger]
   * @returns {Promise<string>} The access token
   */
  async getUserAccessToken(userEmail, logger) {
    if (!userEmail) {
      throw new Error('User email is required for JWT Bearer authentication')
    }

    const cached = this.userTokenCache.get(userEmail)

    // Return cached token if still valid
    if (cached && this.isTokenValid(cached.expiresAt)) {
      return cached.token
    }

    try {
      const tokenResponse = await authenticateWithJWT(userEmail, logger)

      const token = tokenResponse.access_token
      if (!token) {
        throw new Error('Salesforce JWT token response missing access_token')
      }

      const instanceUrl = tokenResponse.instance_url || this.cfg.baseUrl || null
      const expiresAt = this.calculateTokenExpiry(tokenResponse)

      this.userTokenCache.set(userEmail, {
        token,
        instanceUrl,
        expiresAt
      })

      return token
    } catch (error) {
      logger?.error(
        { err: error, userEmail },
        'Failed to acquire user access token'
      )
      throw error
    }
  }

  /**
   * Acquire a bearer token using the client credentials grant (system-level).
   * Tokens are cached until shortly before expiry.
   * @param {import('pino').Logger} [logger] Optional logger.
   */
  async getAccessToken(logger) {
    if (this.cachedToken && this.isTokenValid(this.expiresAt)) {
      return this.cachedToken
    }

    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      if (this.cachedToken && this.isTokenValid(this.expiresAt)) {
        return this.cachedToken
      }

      if (!this.cfg.clientId || !this.cfg.clientSecret) {
        throw new Error('Salesforce client credentials are not configured')
      }

      const authUrl = this.resolveAuthUrl()
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret
      })

      const { response, body } = await this.requestWithTimeout(
        authUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        },
        {
          timeoutMessage: 'Salesforce token request timed out'
        }
      )

      if (!response.ok) {
        logger?.error(
          { status: response.status, body: this.safeMessage(body) },
          'Salesforce token request failed'
        )

        throw new Error(
          `Failed to fetch Salesforce token (${response.status}): ${this.safeMessage(
            body
          )}`
        )
      }

      const token = body.access_token

      if (!token) {
        throw new Error('Salesforce token response missing access_token')
      }

      this.cachedToken = token
      this.cachedInstanceUrl = body.instance_url || this.cfg.baseUrl || null
      this.expiresAt = this.calculateTokenExpiry(body)

      return this.cachedToken
    })()

    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Send a composite API request to Salesforce.
   * Uses system-level M2M authentication only.
   *
   * @param {object} compositeBody The request payload to forward.
   * @param {import('pino').Logger} [logger] Optional logger.
   * @returns {Promise<import('../../types/salesforce/composite-response.js').CompositeResponse>} The Salesforce composite response.
   */
  async sendComposite(compositeBody, logger) {
    return this.sendRequest(
      HTTPMethods.POST,
      'composite',
      compositeBody,
      logger
    )
  }

  /**
   * Create a customer (Contact) in Salesforce.
   * Uses system-level M2M authentication only.
   *
   * @param {object} payload The request payload to forward.
   * @param {import('pino').Logger} [logger] Optional logger.
   * @returns {Promise<import('../../types/salesforce/contact-response.js').CreateGuestResponse>} The Salesforce create guest response.
   */
  async createCustomer(payload, logger) {
    return this.sendRequest(
      HTTPMethods.POST,
      'sobjects/Contact',
      payload,
      logger
    )
  }

  /**
   * @param {object} payload The request payload to forward.
   * @param {import('pino').Logger} [logger] Optional logger.
   * @returns {Promise<import('../../types/salesforce/contact-response.js').CreateGuestResponse>} The Salesforce create case response.
   */
  async createCase(payload, applicationReference, logger) {
    return this.sendRequest(
      HTTPMethods.PATCH,
      `sobjects/Case/APHA_ExternalReferenceNumber__c/${applicationReference}`,
      payload,
      logger
    )
  }

  /**
   * @param {string} relativePath
   * @param {object} payload
   * @param {import('pino').Logger} [logger] Optional logger.
   * @returns {Promise<any>} The Salesforce response body.
   */
  /**
   * @param {(typeof HTTPMethods.PATCH | typeof HTTPMethods.POST)} method
   * @param {string} relativePath
   * @param {object} payload
   * @param {import('pino').Logger} [logger] Optional logger.
   * @returns {Promise<any>} The Salesforce response body.
   */
  async sendRequest(method, relativePath, payload, logger) {
    const token = await this.getAccessToken(logger)

    const methodName = String(method || '').toUpperCase()

    logger?.debug(`Sending ${methodName} request`, {
      relativePath,
      authContext: 'system-level'
    })

    const url = this.getBaseUrl() + '/' + relativePath.replace(/^\/+/, '')

    const { response, body } = await this.requestWithTimeout(
      url,
      {
        method: methodName,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      {
        timeoutMessage: `Salesforce ${methodName} request timed out`
      }
    )

    if (!response.ok) {
      logger?.error(
        { status: response.status, body: this.safeMessage(body) },
        `Salesforce ${methodName} request failed`
      )

      throw new Error(
        `Salesforce ${methodName} request failed (${response.status}): ${this.safeMessage(
          body
        )}`
      )
    }

    return body
  }

  /**
   * Execute a SOQL query against Salesforce.
   * @param {string} query The SOQL query string.
   * @param {string} token Salesforce access token (required).
   * @param {import('pino').Logger} [logger] Optional logger.
   * @returns {Promise<any>} The Salesforce query response.
   */
  async sendQuery(query, token, logger) {
    if (!token) {
      throw new Error('Salesforce access token is required for sendQuery')
    }

    logger?.debug('Sending query request', {
      authContext: 'user-level'
    })

    const queryUrl = this.getBaseUrl() + '/query?q=' + encodeURIComponent(query)

    const { response, body } = await this.requestWithTimeout(
      queryUrl,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      {
        timeoutMessage: 'Salesforce query request timed out'
      }
    )

    if (!response.ok) {
      logger?.error(
        { status: response.status, body: this.safeMessage(body) },
        'Salesforce query request failed'
      )

      throw new Error(
        `Salesforce query request failed (${response.status}): ${this.safeMessage(
          body
        )}`
      )
    }

    return body
  }

  /**
   * Parse response JSON or text without throwing.
   * @param {Response} response
   */
  async parseResponseBody(response) {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        return await response.json()
      } catch (error) {
        return { parseError: error.message }
      }
    }

    try {
      const text = await response.text()

      return text ? { message: text } : {}
    } catch {
      return {}
    }
  }

  /**
   * Normalise unknown objects into short loggable strings.
   * @param {unknown} body
   */
  safeMessage(body) {
    if (!body) {
      return 'No response body'
    }

    if (typeof body === 'string') {
      return body
    }

    if (typeof body === 'object') {
      if (Array.isArray(body) && body[0]) {
        return JSON.stringify(body[0])
      }

      if ('message' in body) {
        return `${body.message}`
      }

      return JSON.stringify(body)
    }

    return String(body)
  }

  /**
   * Create an abort controller with the configured timeout.
   */
  timeoutController() {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      this.cfg.requestTimeoutMs
    )

    return {
      signal: controller.signal,
      cancel: () => clearTimeout(timeout)
    }
  }

  /**
   * Execute a fetch with request timeout handling and parsed body.
   * @param {string} url
   * @param {object} init
   * @param {object} [options]
   * @param {string} [options.timeoutMessage]
   */
  async requestWithTimeout(url, init, { timeoutMessage } = {}) {
    const { signal, cancel } = this.timeoutController()

    let response

    try {
      response = await proxyFetch(url, { ...init, signal })
      const body = await this.parseResponseBody(response)

      return { response, body }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(timeoutMessage || 'Request timed out')
      }

      throw error
    } finally {
      cancel()
    }
  }

  getBaseUrl() {
    const baseUrl = this.resolveBaseUrl()

    if (!baseUrl) {
      throw new Error('Salesforce base URL is not configured')
    }

    return `${baseUrl.replace(/\/$/, '')}/services/data/${this.cfg.apiVersion}`
  }
}

export const salesforceClient = new SalesforceClient()
