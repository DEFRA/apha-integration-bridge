import dotenv from 'dotenv'

dotenv.config()

export default {
  rootDir: '.',
  verbose: true,
  resetModules: true,
  clearMocks: true,
  silent: false,
  injectGlobals: false,
  preset: '@shelf/jest-mongodb',
  watchPathIgnorePatterns: ['globalConfig'],
  testMatch: ['**/src/**/*.test.js'],
  reporters: ['default', ['github-actions', { silent: false }], 'summary'],
  setupFiles: ['<rootDir>/.jest/setup-files.js'],
  setupFilesAfterEnv: ['<rootDir>/.jest/setup-files-after-env.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    'index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10
    }
  },
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    `node_modules/(?!${[
      '@defra/hapi-tracing', // Supports ESM only
      'node-fetch' // Supports ESM only
    ].join('|')}/)`
  ]
}
