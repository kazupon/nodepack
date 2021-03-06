/** @typedef {import('@nodepack/utils').Preset} Preset */

const {
  chalk,
  toShortPluginId,
} = require('@nodepack/utils')

/**
 * @param {Preset} preset
 */
exports.getFeatures = (preset) => {
  const features = []
  const plugins = Object.keys(preset.plugins || []).filter(dep => {
    return dep !== '@nodepack/service'
  })
  features.push.apply(features, plugins)
  return features
}

/**
 * @param {Preset} preset
 * @param {string} lead
 * @param {string} joiner
 */
exports.formatFeatures = (preset, lead = '', joiner = ', ') => {
  const features = exports.getFeatures(preset)
  return features.map(dep => {
    dep = toShortPluginId(dep)
    return `${lead}${chalk.yellow(dep)}`
  }).join(joiner)
}
