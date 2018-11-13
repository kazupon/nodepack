/** @typedef {import('../lib/PackPlugin.js').PackPluginApply} PackPluginApply */

/** @type {PackPluginApply} */
module.exports = (api, options) => {
  api.registerCommand('dev', {
    description: 'Build and live-reload the app',
    usage: 'nodepack dev [entry]',
  }, async (args) => {
    const path = require('path')
    const { info, error, chalk } = require('@moonreach/nodepack-utils')

    info(chalk.blue('Preparing development pack...'))

    if (args._ && typeof args._[0] === 'string') {
      options.entry = args._[0]
    } else if (!options.entry) {
      const { getDefaultEntry } = require('../util/defaultEntry.js')
      options.entry = getDefaultEntry(api.getCwd())
    }

    const webpack = require('webpack')
    const webpackConfig = api.resolveWebpackConfig()
    const execa = require('execa')

    /** @type {execa.ExecaChildProcess} */
    let child

    const compiler = webpack(webpackConfig)
    compiler.watch(
      webpackConfig.watchOptions,
      (err, stats) => {
        if (err) {
          error(err)
        } else {
          if (child) {
            child.kill()
          }

          if (stats.hasErrors()) {
            error(`Build failed with errors.`)
          } else {
            if (child) {
              info(chalk.blue('App restarting...'))
            } else {
              info(chalk.blue('App starting...'))
            }

            const file = api.resolve(path.join(webpackConfig.output.path, webpackConfig.output.filename))

            child = execa('node', [
              file,
            ], {
              stdio: ['inherit', 'inherit', 'inherit'],
              cwd: api.getCwd(),
              cleanup: true,
              shell: false,
            })

            child.on('error', err => {
              error(err)
            })
          }
        }
      }
    )
  })
}
