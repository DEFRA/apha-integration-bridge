/**
 * Automatically authorizes Swagger UI
 */

// @ts-nocheck
;(function () {
  'use strict'

  const TOKEN_PATH = '/oauth2/token'
  const AUTH_SCHEME = 'Bearer'
  const RETRY_DELAY = 200

  const COGNITO_URL =
    window.COGNITO_TOKEN_URL ||
    'https://apha-integration-bridge-c63f2.auth.eu-west-2.amazoncognito.com/oauth2/token'

  function waitForSwaggerUI(callback) {
    if (window.ui && window.ui.getSystem) {
      return callback()
    }
    setTimeout(() => waitForSwaggerUI(callback), RETRY_DELAY)
  }

  function installFetchInterceptor() {
    const system = window.ui.getSystem()

    if (!system?.fn?.fetch) {
      console.log('[Cognito Auth] Swagger fetch not ready, retrying...')
      return setTimeout(installFetchInterceptor, RETRY_DELAY)
    }

    const originalFetch = system.fn.fetch

    system.fn.fetch = function (req) {
      // Check if this is a request to the /oauth2/token endpoint
      if (req?.url?.includes(TOKEN_PATH)) {
        const bodyParams = new URLSearchParams(req.body)
        const grantType = bodyParams.get('grant_type')
        const clientId = bodyParams.get('client_id')
        const clientSecret = bodyParams.get('client_secret')

        // Call Cognito directly from the browser
        return fetch(COGNITO_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: grantType,
            client_id: clientId,
            client_secret: clientSecret
          }).toString()
        })
          .then((response) => response.json())
          .then((data) => {
            console.log('[Cognito Auth] Received token from Cognito:', data)

            // Auto-authorize Swagger UI
            if (data.access_token) {
              setTimeout(() => {
                window.ui.preauthorizeApiKey(AUTH_SCHEME, data.access_token)
                alert(
                  `✅ Auto-authorized!\n\nToken expires in ${data.expires_in} seconds.\n\nYou can now use other API endpoints.`
                )
              }, 100)
            }

            const headersMap = {
              'content-type': 'application/json',
              'content-length': JSON.stringify(data).length.toString()
            }

            const headers = {
              get: (key) => headersMap[key.toLowerCase()] || null,
              has: (key) => key.toLowerCase() in headersMap,
              forEach: (callback) => {
                Object.entries(headersMap).forEach(([k, v]) => callback(v, k))
              }
            }

            return {
              ok: true,
              status: 200,
              statusText: 'OK',
              url: req.url,
              headers,
              text: JSON.stringify(data),
              data: JSON.stringify(data),
              body: JSON.stringify(data)
            }
          })
          .catch((error) => {
            console.error('[Cognito Auth] Error calling Cognito:', error)

            const errorData = { error: error.message }
            const errorText = JSON.stringify(errorData)
            const errorHeadersMap = {
              'content-type': 'application/json',
              'content-length': errorText.length.toString()
            }

            const errorHeaders = {
              get: (key) => errorHeadersMap[key.toLowerCase()] || null,
              has: (key) => key.toLowerCase() in errorHeadersMap,
              forEach: (callback) => {
                Object.entries(errorHeadersMap).forEach(([k, v]) =>
                  callback(v, k)
                )
              }
            }

            return {
              ok: false,
              status: 500,
              statusText: 'Internal Server Error',
              url: req.url,
              headers: errorHeaders,
              text: errorText,
              data: errorText,
              body: errorText
            }
          })
      }

      // For all other requests, use the original fetch
      return originalFetch.call(this, req)
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
