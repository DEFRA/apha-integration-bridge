import { config } from '../../config.js'

const TOKEN_EXPIRY_BUFFER_MS = 5000

/**
 * Lightweight Salesforce client with in-memory token caching.
 */
class SalesforceClient {
  constructor() {
    this.cachedToken = null
    this.cachedInstanceUrl = null
    this.expiresAt = 0
  }

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
   * Acquire a bearer token using the client credentials grant.
   *
   * Tokens are cached until shortly before expiry.
   */
  async getAccessToken(logger) {
    const now = Date.now()

    if (this.cachedToken && now < this.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
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
        { status: response.status, body },
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

    const expiresIn = Number.parseInt(body.expires_in, 10)
    const expiresInMs = Number.isFinite(expiresIn)
      ? expiresIn * 1000
      : 15 * 60 * 1000

    this.expiresAt = Date.now() + expiresInMs

    return this.cachedToken
  }

  /**
   * Send a composite API request to Salesforce.
   *
   * @param {object} compositeBody The request payload to forward.
   * @param {import('pino').Logger} [logger] Optional logger.
   */
  async sendComposite(compositeBody, logger) {
    if (!this.cfg.enabled) {
      throw new Error('Salesforce integration is disabled')
    }

    const baseUrl = this.resolveBaseUrl()

    if (!baseUrl) {
      throw new Error('Salesforce base URL is not configured')
    }

    const token = await this.getAccessToken(logger)

    const compositeUrl = `${baseUrl.replace(
      /\/$/,
      ''
    )}/services/data/${this.cfg.apiVersion}/composite`

    const { response, body } = await this.requestWithTimeout(
      compositeUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(compositeBody)
      },
      {
        timeoutMessage: 'Salesforce composite request timed out'
      }
    )

    if (!response.ok) {
      logger?.error(
        { status: response.status, body },
        'Salesforce composite request failed'
      )

      throw new Error(
        `Salesforce composite request failed (${response.status}): ${this.safeMessage(
          body
        )}`
      )
    }

    return body
  }

  /**
   * Parse response JSON or text without throwing.
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
   */
  async requestWithTimeout(url, init, { timeoutMessage } = {}) {
    const { signal, cancel } = this.timeoutController()

    let response

    try {
      response = await fetch(url, { ...init, signal })
    } catch (error) {
      cancel()

      if (error.name === 'AbortError') {
        throw new Error(timeoutMessage || 'Request timed out')
      }

      throw error
    }

    cancel()

    const body = await this.parseResponseBody(response)

    return { response, body }
  }
}

export const salesforceClient = new SalesforceClient()
