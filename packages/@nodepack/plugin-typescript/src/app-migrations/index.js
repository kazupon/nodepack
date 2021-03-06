/** @type {import('@nodepack/service').MigrationPlugin} */
module.exports = api => {
  api.register({
    id: 'default-template@0.0.1',
    title: 'Template: Render default template',
    // when: api => api.fromVersion('<0.0.1') || api.isFirstInstall,
    prompts: () => [
      {
        name: 'tslint',
        message: 'Use TSLint',
        type: 'confirm',
      },
    ],
    migrate: (api, options) => {
      api.render('./templates-0.0.1/default', options)
      api.move('src/**/*.js', file => `${file.path}${file.name}.ts`)

      if (options.tslint) {
        api.extendPackage({
          scripts: {
            'lint': 'nodepack-service lint',
          },
        })
      }
    },
    rollback: (api, options) => {
      api.unrender('./templates-0.0.1/default')
      api.move('src/**/*.ts', file => `${file.path}${file.name}.js`)

      if (options.tslint) {
        api.extendPackage(({ scripts }) => {
          if (scripts) {
            scripts = { ...scripts }
            for (const key in scripts) {
              if (scripts[key].match(/nodepack-service lint/)) {
                delete scripts[key]
              }
            }
          }
          return { scripts }
        }, false)
      }
    },
  })

  // api.register({
  //   id: 'tsconfig-test-libs@0.0.1',
  //   title: 'tsconfig: Added test libs',
  //   migrate: (api, options) => {
  //     // TODO
  //   },
  //   rollback: (api, options) => {
  //     // TODO
  //   },
  // })
}
