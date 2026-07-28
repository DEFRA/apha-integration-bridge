import { SamClient } from './client.js'

// The app-wide Sam client instance — everything shares one token cache.
// Tests that need isolation build their own `new SamClient()`.
export const samClient = new SamClient()
