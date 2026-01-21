import { config } from '../../config.js'

const TOKEN_EXPIRY_BUFFER_MS = 5000

/**
 * Lightweight Salesforce client with in-memory token caching.
 */
class SalesforceClient {
  cachedToken = null
  cachedInstanceUrl = null
  expiresAt = 0
  refreshPromise = null

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
   * Tokens are cached until shortly before expiry.
   * @param {import('pino').Logger} [logger] Optional logger.
   */
  async getAccessToken(logger) {
    const now = Date.now()

    if (this.cachedToken && now < this.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      return this.cachedToken
    }

    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      const refreshCheck = Date.now()

      if (
        this.cachedToken &&
        refreshCheck < this.expiresAt - TOKEN_EXPIRY_BUFFER_MS
      ) {
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

      const expiresIn = Number.parseInt(body.expires_in, 10)
      const expiresInMs = Number.isFinite(expiresIn)
        ? expiresIn * 1000
        : 15 * 60 * 1000

      this.expiresAt = Date.now() + expiresInMs

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
   *
   * @param {object} compositeBody The request payload to forward.
   * @param {import('pino').Logger} [logger] Optional logger.
   */
  async sendComposite(compositeBody, logger) {
    const token = await this.getAccessToken(logger)

    const compositeUrl = this.getBaseUrl() + '/composite'

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
        { status: response.status, body: this.safeMessage(body) },
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

  async sendQuery(query, logger) {
    const token = await this.getAccessToken(logger)

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
      response = await fetch(url, { ...init, signal })
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
