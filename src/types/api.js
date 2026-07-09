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
 * Decoded JWT artifacts that the auth plugin (`authPlugin`) attaches to the
 * request after a successful authentication. `client_id` is optional only
 * because routes with `auth: false` never populate artifacts; when auth has
 * run, the plugin guarantees it is a non-empty string.
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

/**
 * A Hapi request augmented with the per-request rate limit state set by
 * `rateLimitPlugin` in `onPreHandler` and read back in `onPreResponse`.
 * `rateLimit` is optional because exempt paths (e.g. `/health`) skip the
 * limiter and never populate it.
 *
 * @typedef {import('@hapi/hapi').Request & {
 *   app: {
 *     rateLimit?: import('../common/helpers/rate-limit.js').RateLimitInfo
 *   }
 * }} HapiRequestWithRateLimit
 */

/**
 * Type-level anchor for hapi-pino. Importing the module here keeps its
 * `declare module '@hapi/hapi'` augmentation — the non-optional
 * `Request.logger` / `Server.logger` every controller relies on — inside
 * the typecheck program even if `request-logger.js` ever stops being
 * reachable from it.
 *
 * @typedef {import('hapi-pino').Options} HapiPinoOptions
 */

/**
 * The async-disposable OracleDB session returned by the
 * `server['oracledb.<pool>']()` decorations registered in
 * `src/common/helpers/oracledb.js`. `await using` calls the disposer,
 * which closes the connection and records its open duration.
 *
 * @typedef {{
 *   connection: import('oracledb').Connection
 * } & AsyncDisposable} OracleDbSession
 */

/**
 * The Hapi server as decorated by the oracledb plugin: one session
 * factory per pool configured in `config.oracledb` (currently `sam` and
 * `pega`).
 *
 * @typedef {import('@hapi/hapi').Server & {
 *   'oracledb.sam': () => Promise<OracleDbSession>,
 *   'oracledb.pega': () => Promise<OracleDbSession>
 * }} ServerWithOracle
 */

/**
 * A request as a controller (route handler) actually receives it at
 * runtime: the server carries the oracledb decorations and the versioning
 * plugin has set `pre.apiVersion` in `onRequest`. `request.logger` needs
 * no re-declaration — hapi-pino's module augmentation already types it
 * non-optionally on every Request.
 *
 * @typedef {import('@hapi/hapi').Request & {
 *   server: ServerWithOracle,
 *   pre: { apiVersion: number }
 * }} ControllerRequest
 */

export {}
