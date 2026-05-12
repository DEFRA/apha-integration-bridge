// Shared JSDoc typedefs for Hapi infrastructure used across this service's
// plugins and routes. Consumers re-alias the types they need with a JSDoc
// `@typedef` that imports from this file. Keep this file JSDoc-only — it's
// deliberately load-bearing for types, not runtime code.

/**
 * Aliases for the base Hapi types so consumers can re-import them through
 * this file rather than restating `import('@hapi/hapi').X` everywhere.
 *
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 * @typedef {import('@hapi/hapi').ResponseObject} ResponseObject
 */

/**
 * Decoded JWT artifacts that the auth plugin (`authPlugin` /
 * `bearerTokenPlugin`) attaches to the request after a successful
 * authentication. `client_id` is optional only because routes with
 * `auth: false` never populate artifacts; when auth has run, the plugin
 * guarantees it is a non-empty string.
 *
 * @typedef {Object} JwtArtifacts
 * @property {string} [client_id]
 */

/**
 * A Hapi request augmented with the per-request state set by
 * `clientScopesPlugin` (`request.app.scopes`) and the auth plugin
 * (`request.auth.artifacts.client_id`). Used by `clientScopesPlugin` and
 * `piiContextPlugin`.
 *
 * @typedef {import('@hapi/hapi').Request & {
 *   app: { scopes?: string[] },
 *   auth: { artifacts: JwtArtifacts }
 * }} HapiRequestWithScopes
 */

/**
 * A Hapi request augmented with the tracing state set by
 * `opentelemetryPlugin` on `onRequest`.
 *
 * @typedef {import('@hapi/hapi').Request & {
 *   app: {
 *     startTime: number,
 *     span: import('@opentelemetry/api').Span
 *   }
 * }} HapiRequestWithSpan
 */

export {}
