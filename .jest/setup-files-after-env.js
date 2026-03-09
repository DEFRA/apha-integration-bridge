import { afterAll } from '@jest/globals'

// Set CDP Mongo URI to URI supplied by @shelf/jest-mongodb -https://github.com/shelfio/jest-mongodb?tab=readme-ov-file#3-configure-mongodb-client
process.env.MONGO_URI = global.__MONGO_URI__
process.env.LOG_ENABLED = false

/**
 * Dynamically import and shutdown telemetry providers after all tests complete
 * to prevent the periodic metric exporter from keeping the event loop alive.
 * Dynamic import avoids freezing config before tests can mutate process.env.
 */
afterAll(async () => {
  try {
    const { meterProvider, telemetry } = await import(
      '../src/lib/telemetry/index.js'
    )
    await Promise.allSettled([telemetry.shutdown(), meterProvider.shutdown()])
  } catch (error) {
    // Telemetry may not be initialized in all test contexts, silently continue
  }
})
