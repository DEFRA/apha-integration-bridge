// @ts-nocheck
const TOKEN_PATH = '/oauth2/token'
const AUTH_SCHEME = 'Bearer'
const RETRY_DELAY = 200
const MAX_RETRIES = 50

let swaggerRetries = 0
let fetchRetries = 0

/**
 * @param {boolean} ok - Whether the response was successful
 * @param {number} status - HTTP status code
 * @param {string} statusText - Status text
 * @param {string} url - Request URL
 * @param {Headers} headers - Response headers
 * @param {object} data - Response data object
 */
function createSwaggerResponse(ok, status, statusText, url, headers, data) {
  const responseData = JSON.stringify(data)
  return {
    ok,
    status,
    statusText,
    url,
    headers,
    text: () => Promise.resolve(responseData),
    json: () => Promise.resolve(data),
    data: responseData,
    body: responseData
  }
}

/**
 * @param {Function} callback
 */
function waitForSwaggerUI(callback) {
  if (window.ui && window.ui.getSystem) {
    return callback()
  }
  if (swaggerRetries >= MAX_RETRIES) {
    console.error(
      '[Cognito Auth] Swagger UI failed to load after maximum retries'
    )
    return
  }
  swaggerRetries++
  setTimeout(() => waitForSwaggerUI(callback), RETRY_DELAY)
}

function installFetchInterceptor() {
  const system = window.ui.getSystem()

  if (!system?.fn?.fetch) {
    if (fetchRetries >= MAX_RETRIES) {
      console.error(
        '[Cognito Auth] Swagger fetch not available after maximum retries'
      )
      return
    }
    fetchRetries++
    return setTimeout(installFetchInterceptor, RETRY_DELAY)
  }

  const originalFetch = system.fn.fetch
  const COGNITO_URL = window.COGNITO_TOKEN_URL

  if (!COGNITO_URL) {
    console.error('[Cognito Auth] COGNITO_TOKEN_URL not configured')
    return
  }

  system.fn.fetch = function (req) {
    if (req?.url?.includes(TOKEN_PATH)) {
      const bodyParams = new URLSearchParams(req.body)
      const grantType = bodyParams.get('grant_type')
      const clientId = bodyParams.get('client_id')
      const clientSecret = bodyParams.get('client_secret')

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
        .then((response) => {
          if (!response.ok) {
            return response.text().then((errorText) => {
              console.error(
                '[Cognito Auth] Cognito returned error:',
                response.status,
                errorText
              )

              let errorObj
              try {
                errorObj = JSON.parse(errorText)
              } catch {
                errorObj = { error: errorText || 'Authentication failed' }
              }

              return createSwaggerResponse(
                false,
                response.status,
                response.statusText,
                req.url,
                response.headers,
                errorObj
              )
            })
          }

          return response.json().then((data) => {
            if (data.access_token) {
              setTimeout(() => {
                window.ui.preauthorizeApiKey(AUTH_SCHEME, data.access_token)
                // eslint-disable-next-line no-undef
                alert(
                  `✅ Auto-authorized!\n\nToken expires in ${data.expires_in} seconds.\n\nYou can now use other API endpoints.`
                )
              }, 100)
            }

            return createSwaggerResponse(
              true,
              200,
              'OK',
              req.url,
              response.headers,
              data
            )
          })
        })
        .catch((error) => {
          console.error(
            '[Cognito Auth] Network error or request failure:',
            error
          )

          const errorHeaders = new Headers({
            'content-type': 'application/json'
          })
          const errorObj = { error: error.message }

          return createSwaggerResponse(
            false,
            500,
            'Network Error',
            req.url,
            errorHeaders,
            errorObj
          )
        })
    }

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
