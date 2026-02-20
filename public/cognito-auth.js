/**
 * Automatically authorizes Swagger UI after a successful /oauth2/token response.
 */

// @ts-nocheck
;(function () {
  'use strict'

  const TOKEN_PATH = '/oauth2/token'
  const AUTH_SCHEME = 'Bearer'
  const RETRY_DELAY = 200

  function waitForSwaggerUI(callback) {
    if (window.ui && window.ui.getSystem) {
      return callback()
    }

    setTimeout(() => waitForSwaggerUI(callback), RETRY_DELAY)
  }

  function safeParse(body) {
    if (!body) return null

    try {
      return typeof body === 'string' ? JSON.parse(body) : body
    } catch (err) {
      console.error('[Cognito Auth] Failed to parse response:', err)
      return null
    }
  }

  function installFetchInterceptor() {
    const system = window.ui.getSystem()

    if (!system?.fn?.fetch) {
      console.log('[Cognito Auth] fetch not ready, retrying...')
      return setTimeout(installFetchInterceptor, RETRY_DELAY)
    }

    const originalFetch = system.fn.fetch

    system.fn.fetch = function (req) {
      const responsePromise = originalFetch.call(this, req)

      if (!req?.url?.includes(TOKEN_PATH)) {
        return responsePromise
      }

      return responsePromise.then((response) => {
        if (!response?.ok || response.status !== 200) {
          return response
        }

        const body = response.text || response.data || response.body
        const parsed = safeParse(body)

        if (!parsed?.access_token) {
          return response
        }

        console.log('[Cognito Auth] Access token received, authorizing...')

        setTimeout(() => {
          window.ui.preauthorizeApiKey(AUTH_SCHEME, parsed.access_token)

          alert(
            `✅ Auto-authorized!\n\nToken expires in ${parsed.expires_in} seconds.\n\nYou can now use other API endpoints.`
          )
        }, 100)

        return response
      })
    }
  }

  function init() {
    waitForSwaggerUI(installFetchInterceptor)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
