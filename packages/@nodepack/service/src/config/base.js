/** @type {import('../../types/ServicePlugin').ServicePlugin} */
module.exports = (api, options) => {
  const resolveLocal = require('../util/resolveLocal')

  api.chainWebpack(config => {
    // Basics
    config
      // Target
      .target('node')
      // Entry
      .entry('app')
        .add(api.resolve(options.entry || 'index.js'))
      .end()
      .context(api.getCwd())

    // Output
    config.output
      .set('path', api.resolve(options.outputDir || 'dist'))
      .set('filename', '[name].js')
      .set('libraryTarget', 'commonjs2')

    // Resolve
    config.resolve
      .extensions
        .merge(['.mjs', '.js', '.json'])
      .end()
      .modules
        .add('node_modules')
        .add(api.resolve('node_modules'))
        .add(resolveLocal('node_modules'))
      .end()
      .alias
        .set('@', api.resolve(options.srcDir || 'src'))
      .end()

    // Loader resolve
    config.resolveLoader
      .modules
        .add('node_modules')
        .add(api.resolve('node_modules'))
        .add(resolveLocal('node_modules'))

    // Module
    config.module
      .set('exprContextCritical', options.externals)

    // External modules (default are modules in package.json deps)
    if (options.externals !== false) {
      if (options.externals === true) {
        const nodeExternals = require('webpack-node-externals')
        config.externals(nodeExternals({
          whitelist: (options.nodeExternalsWhitelist || [
            /\.(eot|woff|woff2|ttf|otf)$/,
            /\.(svg|png|jpg|jpeg|gif|ico|webm)$/,
            /\.(mp4|mp3|ogg|swf|webp)$/,
            /\.(css|scss|sass|less|styl)$/,
          ]).concat(['@nodepack/module']),
          modulesFromFile: true,
        }))
      } else if (Array.isArray(options.externals)) {
        config.externals(options.externals.concat(['@nodepack/module']))
      } else {
        config.externals([options.externals, '@nodepack/module'])
      }
    } else {
      config.externals(['@nodepack/module'])
    }

    // Plugins
    config
      .plugin('friendly-errors')
        .use(require('friendly-errors-webpack-plugin'), [{
          clearConsole: process.env.NODE_ENV === 'development',
        }])

    const resolveClientEnv = require('../util/resolveClientEnv')
    config
      .plugin('define')
        // @ts-ignore
        .use(require('webpack/lib/DefinePlugin'), [
          resolveClientEnv(options),
        ])

    // Others
    config.stats('minimal')
    config.performance.set('hints', false)
  })
}
