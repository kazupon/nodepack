const program = require('commander')
const { chalk, error, checkDebug } = require('@nodepack/utils')
const isInProject = require('../util/isInProject')

const cwd = process.cwd()

checkDebug(cwd)

program
  .version(require('../../package.json').version)
  .usage('<command> [options]')

program
  .command('create <app-name>')
  .description('create a new project powered by nodepack')
  // Preset
  .option('-p, --preset <presetName>', 'Skip prompts and use saved or remote preset')
  .option('-d, --default', 'Skip prompts and use the default preset')
  .option('-i, --inlinePreset <json>', 'Skip prompts and use inline JSON string as preset')
  .option('-c, --clone', 'Use git clone when fetching remote preset')
  // Install
  .option('-m, --packageManager <command>', 'Use specified npm client when installing dependencies')
  .option('-r, --registry <url>', 'Use specified npm registry when installing dependencies (only for npm)')
  .option('-x, --proxy', 'Use specified proxy when creating project')
  // Git
  .option('-g, --git [message]', 'Force git initialization with initial commit message')
  .option('-n, --no-git', 'Skip git initialization')
  // Folder
  .option('-f, --force', 'Overwrite target directory if it exists')
  .action((appName, cmd) => {
    const options = cleanArgs(cmd)
    // --no-git makes commander to default git to true
    if (process.argv.includes('-g') || process.argv.includes('--git')) {
      options.forceGit = true
    }
    require('../commands/create')(appName, options)
  })

program
  .command('add <plugin>')
  .description('add a plugin to the project')
  // Install
  .option('--no-install', `Don't try to install the plugin with package manager`)
  .option('--forceInstall', `Force installation with package manager even if already installed`)
  .option('-m, --packageManager <command>', 'Use specified npm client when installing dependencies')
  .option('-r, --registry <url>', 'Use specified npm registry when installing dependencies (only for npm)')
  .option('-x, --proxy', 'Use specified proxy when creating project')
  // Git
  .option('-g, --git [message]', 'Force git commit with message before maintenance')
  .option('-n, --no-git', 'Skip git commit before maintenance')
  .action((pluginName, cmd) => {
    checkInProject()
    const options = cleanArgs(cmd)
    // --no-git makes commander to default git to true
    if (process.argv.includes('-g') || process.argv.includes('--git')) {
      options.forceGit = true
    }
    require('../commands/add')(pluginName, options)
  })

program
  .command('upgrade [plugins...]')
  .description(`upgrade one or more plugins`)
  // Version
  .option('-w, --wanted', 'Use wanted versions')
  .option('-l, --latest', 'Use latest versions (may inclide breaking changes!)')
  .option('-y, --yes', 'Skip asking for upgrade confirmation')
  // Install
  .option('-m, --packageManager <command>', 'Use specified npm client when installing dependencies')
  .option('-r, --registry <url>', 'Use specified npm registry when installing dependencies (only for npm)')
  .option('-x, --proxy', 'Use specified proxy when creating project')
  // Git
  .option('-g, --git [message]', 'Force git commit with message before maintenance')
  .option('-n, --no-git', 'Skip git commit before maintenance')
  .action((plugins, cmd) => {
    checkInProject()
    const options = cleanArgs(cmd)
    // --no-git makes commander to default git to true
    if (process.argv.includes('-g') || process.argv.includes('--git')) {
      options.forceGit = true
    }
    require('../commands/upgrade')(plugins, options)
  })

program
  .command('remove <plugin>')
  .description(`remove a plugin from the project`)
  .option('-y, --yes', 'Skip asking for confirmation')
  .option('--skipUninstall', `Don't uninstall with package manager (npm/yarn) after removing`)
  // Git
  .option('-g, --git [message]', 'Force git commit with message before maintenance')
  .option('-n, --no-git', 'Skip git commit before maintenance')
  .action((pluginId, cmd) => {
    checkInProject()
    const options = cleanArgs(cmd)
    // --no-git makes commander to default git to true
    if (process.argv.includes('-g') || process.argv.includes('--git')) {
      options.forceGit = true
    }
    require('../commands/remove')(pluginId, options)
  })

program
  .command('build')
  .description('build your project using `nodepack-service build` in a project')
  .allowUnknownOption()
  .action(cmd => {
    checkInProject()
    const { pkg, packageManager } = getPkgInfo()
    let command = 'nodepack-service'
    let args = ['build']
    if (pkg.scripts && pkg.scripts.build) {
      // Prefer 'run' script in package.json
      command = packageManager
      args = ['run', 'build']
    }
    exec(command, [
      ...args,
      ...process.argv.slice(3),
    ])
  })

program
  .command('service <command>')
  .description('run a command with `nodepack-service` installed in a project')
  .allowUnknownOption()
  .action((action, cmd) => {
    checkInProject()
    const { pkg, packageManager } = getPkgInfo()
    let command = 'nodepack-service'
    let args = [action]
    if (pkg.scripts && pkg.scripts[action]) {
      // Prefer 'run' script in package.json
      command = packageManager
      args = ['run', action]
    }
    exec(command, [
      ...args,
      ...process.argv.slice(4),
    ])
  })

program
  .command('env-info')
  .description('print your environment infos for debugging')
  .option('-e, --env', 'Output env variables')
  .action(async (cmd) => {
    const options = cleanArgs(cmd)
    const { printEnvInfo, printInstalledPackages } = require('@nodepack/env-check')
    await printEnvInfo(options.env)
    await printInstalledPackages(process.cwd())
  })

// output help information on unknown commands
program
  .arguments('<command>')
  .action((cmd) => {
    program.outputHelp()
    console.log(`  ` + chalk.red(`Unknown command ${chalk.yellow(cmd)}.`))
    console.log()
  })

// add some useful info on help
program.on('--help', () => {
  console.log()
  console.log(`  Run ${chalk.cyan(`nodepack <command> --help`)} for detailed usage of given command.`)
  console.log()
})

program.commands.forEach(c => c.on('--help', () => console.log()))

// enhance common error messages
const enhanceErrorMessages = require('../util/enhanceErrorMessages')

enhanceErrorMessages('missingArgument', argName => {
  return `Missing required argument ${chalk.yellow(`<${argName}>`)}.`
})

enhanceErrorMessages('unknownOption', optionName => {
  return `Unknown option ${chalk.yellow(optionName)}.`
})

enhanceErrorMessages('optionMissingArgument', (option, flag) => {
  return `Missing required argument for option ${chalk.yellow(option.flags)}` + (
    flag ? `, got ${chalk.yellow(flag)}` : ``
  )
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  noCommand()
}

function camelize (str) {
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs (cmd) {
  const args = {}
  cmd.options.forEach(o => {
    const key = camelize(o.long.replace(/^--/, ''))
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
      args[key] = cmd[key]
    }
  })
  return args
}

async function noCommand () {
  const path = require('path')
  const fs = require('fs-extra')

  // In a nodepack project
  if (isInProject(cwd)) {
    const { installDeps } = require('@nodepack/utils')
    const { pkg, packageManager } = getPkgInfo()

    // Auto-install
    if (!fs.existsSync(path.resolve(cwd, 'node_modules'))) {
      await installDeps(cwd, packageManager)
    }

    // Run command
    let command = 'nodepack-service'
    let args = ['dev']
    if (pkg.scripts && pkg.scripts.dev) {
      // Prefer 'run' script in package.json
      command = packageManager
      args = ['run', 'dev']
    }
    exec(command, args)
  } else {
    program.outputHelp()
  }
}

function getPkgInfo () {
  const { loadGlobalOptions, getPkgCommand, readPkg } = require('@nodepack/utils')

  const packageManager = (
    loadGlobalOptions().packageManager ||
    getPkgCommand(cwd)
  )
  const pkg = readPkg(cwd)
  return {
    packageManager,
    pkg,
  }
}

function exec (command, args) {
  const execa = require('execa')
  execa(command, args, {
    stdio: [process.stdin, process.stdout, process.stderr],
    cwd: process.cwd(),
    cleanup: true,
    shell: false,
    env: process.env,
  })
}

function checkInProject () {
  if (!isInProject(cwd)) {
    error(`Can't run this command: it seems the current working directory is not a nodepack project.`)
    process.exit(1)
  }
}
