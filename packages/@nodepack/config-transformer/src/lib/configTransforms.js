/**
 * @typedef ReadOptions
 * @prop {string} [filename]
 * @prop {string} [cwd]
 * @prop {string} [source]
 */
/**
 * @typedef WriteOptions
 * @prop {any} value
 * @prop {any} existing
 * @prop {string?} [source]
 */
/**
 * @typedef Transform
 * @prop {(options: ReadOptions) => any} read
 * @prop {(options: WriteOptions) => string} write
 */

const merge = require('deepmerge')
const { loadModule } = require('@nodepack/module')
const extendJSConfig = require('./extendJSConfig')
const stringifyJS = require('./stringifyJS')

const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]))
const mergeOptions = {
  arrayMerge: mergeArrayWithDedupe,
}

const isObject = val => val && typeof val === 'object'

/** @type {Transform} */
const transformJS = {
  read: ({ filename, cwd }) => {
    try {
      return loadModule(filename, cwd, true)
    } catch (e) {
      return null
    }
  },
  write: ({ value, existing, source }) => {
    if (existing) {
      // We merge only the modified keys
      const changedData = {}
      Object.keys(value).forEach(key => {
        const originalValue = existing[key]
        const newValue = value[key]
        if (Array.isArray(originalValue) && Array.isArray(newValue)) {
          changedData[key] = mergeArrayWithDedupe(originalValue, newValue)
        } else if (isObject(originalValue) && isObject(newValue)) {
          changedData[key] = merge(originalValue, newValue, mergeOptions)
        } else {
          changedData[key] = newValue
        }
      })
      return extendJSConfig(changedData, source)
    } else {
      return `module.exports = ${stringifyJS(value)}`
    }
  },
}

/** @type {Transform} */
const transformJSON = {
  read: ({ source }) => JSON.parse(source),
  write: ({ value, existing }) => {
    return JSON.stringify(merge(existing, value, mergeOptions), null, 2)
  },
}

/** @type {Transform} */
const transformYAML = {
  read: ({ source }) => require('js-yaml').safeLoad(source),
  write: ({ value, existing }) => {
    return require('js-yaml').safeDump(merge(existing, value, mergeOptions), {
      skipInvalid: true,
    })
  },
}

/** @type {Transform} */
const transformLines = {
  read: ({ source }) => source.split('\n'),
  write: ({ value, existing }) => {
    if (existing) {
      value = existing.concat(value)
      // Dedupe
      value = value.filter((item, index) => value.indexOf(item) === index)
    }
    return value.join('\n')
  },
}

module.exports = {
  js: transformJS,
  json: transformJSON,
  yaml: transformYAML,
  lines: transformLines,
}
