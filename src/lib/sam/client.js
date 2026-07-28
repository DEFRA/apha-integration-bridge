import { proxyFetch } from '../../common/helpers/proxy/proxy-fetch.js'
import { config, SAM_ENTRA_ENV_VARS } from '../../config.js'

/**
 * @import {Logger} from 'pino'
 */

const TOKEN_EXPIRY_BUFFER_MS = 5000

const DEFAULT_TOKEN_EXPIRY_SECONDS = 900

/**
 * Best error code we can name without leaking upstream error text.
 *
 * @param {unknown} error
 * @returns {string}
 */
function describeError(error) {
  const cause =
    error instanceof Error && error.cause
      ? /** @type {{ code?: string }} */ (error.cause)
      : undefined

  return (
    cause?.code ??
    (error instanceof Error ? error.name : undefined) ??
    'unknown error'
  )
}

/**
 * Upstream failure talking to Sam (network/timeout/redirect, non-JSON body,
 * unexpected status, twice-rejected bearer). The route maps exactly this
 * type to a 502 — anything else it throws is our misconfiguration and
 * becomes a masked 500. Carries safe metadata only: never Sam message text,
 * bodies, tokens or secrets (Sam messages can contain email addresses).
 */
export class SamApiError extends Error {
  /**
   * @param {string} message
   * @param {{ statusCode?: number, samCode?: string, uid?: string }} [meta]
   */
  constructor(message, { statusCode, samCode, uid } = {}) {
    super(message)

    this.name = 'SamApiError'
    this.statusCode = statusCode
    this.samCode = samCode
    this.uid = uid
  }
}

/**
 * Client for the IBM/Sam standardwork write API: EntraID client-credentials
 * token (cached, single-flight) + the update call. Recognisable Sam
 * responses pass through; everything else throws SamApiError.
 */
export class SamClient {
  cachedToken = null
  expiresAt = 0
  refreshPromise = null

  // read per call so config spies in tests take effect per request
  get cfg() {
    return config.get('samApi')
  }

  // baseUrl set = integration on; without it the route 503s. Entra
  // completeness is enforced separately (boot check + assertEntraConfig).
  isConfigured() {
    return Boolean(this.cfg.baseUrl)
  }

  // Same missing/empty/whitespace rule as the boot check. Plain Error on
  // purpose (not SamApiError): bad config is on us, so it should 500, not
  // 502.
  assertEntraConfig() {
    const { entra } = this.cfg

    const missing = Object.entries(SAM_ENTRA_ENV_VARS)
      .filter(([key]) => {
        const value = entra[key]

        return typeof value !== 'string' || value.trim() === ''
      })
      .map(([, envVar]) => envVar)

    if (missing.length > 0) {
      throw new Error(
        `Sam EntraID credentials are not configured: missing ${missing.join(', ')}`
      )
    }
  }

  /**
   * @param {{ expires_in?: unknown }} tokenResponse
   */
  calculateTokenExpiry(tokenResponse) {
    const expiresIn = Number.parseInt(String(tokenResponse.expires_in), 10)
    const expiresInMs = Number.isFinite(expiresIn)
      ? expiresIn * 1000
      : DEFAULT_TOKEN_EXPIRY_SECONDS * 1000

    return Date.now() + expiresInMs
  }

  /**
   * @param {number} expiresAt
   */
  isTokenValid(expiresAt) {
    return Date.now() < expiresAt - TOKEN_EXPIRY_BUFFER_MS
  }

  /**
   * Get a bearer token (client-credentials grant). Cached until just before
   * expiry; concurrent callers share one refresh.
   *
   * @param {Logger} [logger]
   * @returns {Promise<string>}
   */
  async getAccessToken(logger) {
    this.assertEntraConfig()

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

      const { entra } = this.cfg

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: entra.clientId,
        client_secret: entra.clientSecret,
        scope: entra.scope
      })

      const { response, body } = await this.request(
        entra.tokenUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        },
        { context: 'EntraID token request', logger }
      )

      if (!response.ok) {
        logger?.error(
          { statusCode: response.status },
          'EntraID token request failed'
        )

        throw new SamApiError(
          `EntraID token request failed (${response.status})`,
          { statusCode: response.status }
        )
      }

      const accessToken =
        body !== null && typeof body === 'object' ? body.access_token : null

      if (typeof accessToken !== 'string' || accessToken === '') {
        throw new SamApiError(
          'EntraID token response did not contain an access_token'
        )
      }

      this.cachedToken = accessToken
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
   * Compare-and-evict: only clears the cache if it still holds the rejected
   * token, so a late 401 for an old token can't bin a fresh one. In-flight
   * refreshes are left alone — their result is newer by definition.
   *
   * @param {string} rejectedToken
   */
  evictToken(rejectedToken) {
    if (this.cachedToken === rejectedToken) {
      this.cachedToken = null
      this.expiresAt = 0
    }
  }

  buildWriteUrl() {
    const { baseUrl, writePath } = this.cfg

    return baseUrl.replace(/\/+$/, '') + writePath
  }

  /**
   * Send a work schedule activity update to Sam.
   *
   * Passes through { statusCode, body } for JSON 2xx responses and 4xx ones
   * (bar 401) whose code starts 'sam-api-'. A first 401 means our token was
   * rejected before anything happened, so we evict, re-auth and retry once;
   * a second 401 throws. Everything else throws SamApiError. Timeouts and
   * network errors are never retried — the write may have landed.
   *
   * @param {Record<string, unknown>} payload
   * @param {Logger} [logger]
   * @returns {Promise<{ statusCode: number, body: unknown }>}
   */
  async updateStandardActivity(payload, logger) {
    let token = await this.getAccessToken(logger)
    let outcome = await this.sendWrite(token, payload, logger)

    if (outcome.response.status === 401) {
      this.evictToken(token)

      logger?.warn(
        this.logContext(payload, 401),
        'Sam API rejected the bearer token; retrying once with a fresh token'
      )

      token = await this.getAccessToken(logger)
      outcome = await this.sendWrite(token, payload, logger)

      if (outcome.response.status === 401) {
        this.evictToken(token)

        throw new SamApiError('Sam API rejected the bearer token twice', {
          statusCode: 401
        })
      }
    }

    return this.toResult(outcome.response, outcome.body, payload, logger)
  }

  /**
   * @param {string} token
   * @param {Record<string, unknown>} payload
   * @param {Logger} [logger]
   */
  async sendWrite(token, payload, logger) {
    return this.request(
      this.buildWriteUrl(),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      { context: 'Sam write request', logger }
    )
  }

  /**
   * Safe log fields only — ids, status, Sam code/uid. Never the payload or
   * Sam message text.
   *
   * @param {Record<string, unknown>} payload
   * @param {number} statusCode
   * @param {{ samCode?: string, uid?: string }} [meta]
   */
  logContext(payload, statusCode, { samCode, uid } = {}) {
    return {
      workscheduleid: payload.workscheduleid,
      workscheduleactivityid: payload.workscheduleactivityid,
      statusCode,
      samCode,
      uid
    }
  }

  /**
   * Pass-through rules for a Sam response.
   *
   * @param {{ status: number }} response
   * @param {unknown} body
   * @param {Record<string, unknown>} payload
   * @param {Logger} [logger]
   * @returns {{ statusCode: number, body: unknown }}
   */
  toResult(response, body, payload, logger) {
    const { status } = response
    const isJsonObject = body !== null && typeof body === 'object'
    const record = /** @type {Record<string, unknown>} */ (
      isJsonObject ? body : {}
    )
    const samCode = typeof record.code === 'string' ? record.code : undefined
    const uid = typeof record.uid === 'string' ? record.uid : undefined

    // Any parsed JSON passes on 2xx, primitives included; only the 4xx
    // branch demands an object with a sam-api- code.
    const isSuccess = status >= 200 && status < 300 && body !== undefined
    const isRecognisedError =
      status >= 400 &&
      status < 500 &&
      status !== 401 &&
      samCode !== undefined &&
      samCode.startsWith('sam-api-')

    if (isSuccess || isRecognisedError) {
      return { statusCode: status, body }
    }

    logger?.error(
      this.logContext(payload, status, { samCode, uid }),
      'Sam write response is not a recognised Sam business response'
    )

    throw new SamApiError(
      `Sam write API returned an unexpected response (${status})`,
      { statusCode: status, samCode, uid }
    )
  }

  // abort controller wired to the configured per-request timeout
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
   * One outbound request: per-request timeout, redirects refused (a 307/308
   * replay could resend the secret or the PII payload elsewhere), body
   * parsed as JSON. Transport failures throw SamApiError built from the
   * error code only — upstream error text never propagates. An absent or
   * unparseable body comes back as `body: undefined` for the caller to
   * judge.
   *
   * @param {string} url
   * @param {RequestInit} init
   * @param {{ context: string, logger?: Logger }} options
   * @returns {Promise<{ response: Response, body: any }>}
   */
  async request(url, init, { context, logger }) {
    const { signal, cancel } = this.timeoutController()

    try {
      let response

      try {
        response = await proxyFetch(url, { ...init, redirect: 'error', signal })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          logger?.error(`${context} timed out`)

          throw new SamApiError(`${context} timed out`)
        }

        const code = describeError(error)

        logger?.error({ errorCode: code }, `${context} failed`)

        throw new SamApiError(`${context} failed (${code})`)
      }

      let text

      try {
        text = await response.text()
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          logger?.error(`${context} timed out`)

          throw new SamApiError(`${context} timed out`)
        }

        // Stream broke mid-body (connection reset etc). That's a transport
        // failure, not a malformed payload — don't blame a response we
        // never fully received.
        const code = describeError(error)

        logger?.error(
          { errorCode: code },
          `${context} failed while reading the response body`
        )

        throw new SamApiError(
          `${context} failed while reading the response body (${code})`
        )
      }

      let body

      try {
        // undefined = "no JSON" (absent body or parse failure), so a parsed
        // JSON null or primitive stays distinguishable
        body = text === '' ? undefined : JSON.parse(text)
      } catch {
        body = undefined
      }

      return { response, body }
    } finally {
      cancel()
    }
  }
}
