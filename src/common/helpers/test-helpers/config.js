import { config } from '../../../config.js'
import { jest } from '@jest/globals'

const configGet = config.get.bind(config)
/**
 * @param {string} key
 * @param {any} value
 */
export const spyOnConfig = (key, value) => {
  jest.spyOn(config, 'get').mockImplementation((name) => {
    if (name === key) {
      return value
    } else {
      return configGet(name)
    }
  })
  return config
}

export const spyOnConfigMany = (mockConfig) => {
  jest.spyOn(config, 'get').mockImplementation((name) => {
    if (name) {
      return mockConfig[name] === undefined ? configGet(name) : mockConfig[name]
    }
  })

  return config
}
