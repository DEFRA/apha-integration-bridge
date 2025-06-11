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
  }
]
