/** @type {import('../ProjectCreateJob').CreateModule} */
module.exports = api => {
  api.injectFeature({
    name: 'Babel',
    value: 'babel',
    checked: true,
  })

  api.onPromptComplete((answers, preset) => {
    if (answers.features.includes('ts')) {
      if (!answers.useTsWithBabel) {
        return
      }
    } else if (!answers.features.includes('babel')) {
      return
    }
    // @ts-ignore
    preset.plugins['@nodepack/plugin-babel'] = ''
  })
}
