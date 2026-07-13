import babelParser from '@babel/eslint-parser'
import neostandard from 'neostandard'

const neo = neostandard({
  env: ['node', 'jest'],
  ignores: [...neostandard.resolveIgnoresFromGitignore()],
  noJsx: true,
  noStyle: true
})

export default [
  ...neo,
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: true
      }
    }
  },
  {
    // Controllers must fail loudly if request.logger is missing: hapi-pino
    // guarantees it at runtime, the typings declare it non-optional, and
    // tsc happily allows `?.` on non-optional types — so guarded logger
    // calls are forbidden here by lint instead. See
    // .design/PLAN-strict-logger-typings.md.
    files: ['src/routes/**/*.js'],
    ignores: ['**/*.test.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[optional=true][object.property.name='logger']",
          message:
            'Do not optional-chain logger calls in controllers — request.logger is guaranteed; a missing logger must crash (PLAN-strict-logger-typings).'
        },
        {
          selector: "MemberExpression[optional=true][property.name='logger']",
          message:
            'Do not optional-chain access to .logger in controllers — request.logger is guaranteed; a missing logger must crash (PLAN-strict-logger-typings).'
        },
        {
          selector:
            "IfStatement[test.type='MemberExpression'][test.property.name='logger']",
          message:
            'Do not guard logger calls with truthiness checks in controllers — request.logger is guaranteed; a missing logger must crash (PLAN-strict-logger-typings).'
        }
      ]
    }
  }
]
