import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

/**
 * Runs `fn` inside an async context that carries a masking decision.
 *
 * @template T
 * @param {{ shouldMask: boolean }} context
 * @param {() => T} fn
 * @returns {T}
 */
export const runWithMaskingContext = (context, fn) => storage.run(context, fn)

/**
 * Sets the masking context for the rest of the current async chain. Used by
 * the Hapi plugin so a per-request `onPreHandler` extension does not need to
 * wrap the route handler.
 *
 * @param {{ shouldMask: boolean }} context
 */
export const enterMaskingContext = (context) => storage.enterWith(context)

/**
 * Masks a value when the current request's masking context is active.
 *
 * Rule: strings of length 6 or more keep their first and last character and
 * mask the middle (`Smithy` -> `S****y`); shorter strings (and any non-string
 * scalar coerced to string) are fully masked. Null, undefined and empty
 * strings pass through unchanged.
 *
 * @param {string | null | undefined} value
 */
export const mask = (value) => {
  if (storage.getStore()?.shouldMask !== true) {
    return value
  }

  if (value === null || value === undefined || value === '') {
    return value
  }

  const str = String(value)

  if (str.length <= 5) {
    return '*'.repeat(str.length)
  }

  const mask = '*'.repeat(str.length - 2)

  return `${str[0]}${mask}${str[str.length - 1]}`
}
