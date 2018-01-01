import { isProduction } from './helpers/is-production';
import { runScript } from './helpers/run-script';
import { insertDefaultOptions } from './helpers/default-options';
import { getAllFunctionFolders } from './helpers/get-function-folders';
import { isPluginDisabled } from './helpers/is-plugin-disabled';
import { addFunction, removeFunction } from './helpers/add-function';

const CLEAN_COMMAND = 'clean';
const BUILD_COMMAND = 'build';

class ServerlessNodejsIndividuallyPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    insertDefaultOptions(serverless);
  }

  commands = {
    build: {
      usage: 'Builds all or one specific function',
      lifecycleEvents: [
        'build'
      ],
      options: {
        clean: {
          usage: 'Force clean the build outputs',
          required: false
        },
        function: {
          usage: 'Specify the function you want to build '
            + '(e.g. "--function \'my-function\'" or "-f \'my-function\'")',
          required: false,
          shortcut: 'f'
        }
      }
    },
    clean: {
      usage: 'Cleans the build output of all or one specific function',
      lifecycleEvents: [
        'clean'
      ],
      options: {
        function: {
          usage: 'Specify the function you want to clean '
            + '(e.g. "--function \'my-function\'" or "-f \'my-function\'")',
          required: false,
          shortcut: 'f'
        }
      }
    },
    function: {
      usage: 'Manages functions',
      commands: {
        add: {
          usage: 'Adds a function to this service',
          lifecycleEvents: [
            'add'
          ],
          options: {
            name: {
              usage: 'Specify the name of the function you want to add '
                + '(e.g. "--name \'my-function\'" or "-n \'my-function\'")',
              required: true,
              shortcut: 'n'
            }
          }
        },
        remove: {
          usage: 'Removes a function from this service',
          lifecycleEvents: [
            'remove'
          ],
          options: {
            name: {
              usage: 'Specify the name of the function you want to remove '
                + '(e.g. "--name \'my-function\'" or "-n \'my-function\'")',
              required: true,
              shortcut: 'n'
            }
          }
        },
      }
    }
  };

  clean = async (functionName) => {
    const isCleanNeeded =
      this.options.clean ||
      this.serverless.processedInput.commands[0] === 'clean' ||
      isProduction(this.serverless, this.options);
    if (!isCleanNeeded) {
      return;
    }

    const plural = functionName ? '' : 's';
    this.serverless.cli.log(`Cleaning function build output${plural}...`);
    const fns = getAllFunctionFolders(this.serverless, CLEAN_COMMAND, functionName);
    await Promise.all(fns.filter((fn) => {
      const config = this.serverless.service.functions[fn];
      return !isPluginDisabled(config);
    }).map(async (fn) => {
      try {
        await runScript(CLEAN_COMMAND, fn);
      } catch (error) {
        this.serverless.cli.log(`Cleaning function ${fn} failed.`);
        throw error;
      }
    }));
  };

  build = async () => {
    const functionName = this.options.function;
    const plural = functionName ? '' : 's';
    this.serverless.cli.log(`Building function${plural}...`);
    const fns = getAllFunctionFolders(this.serverless, BUILD_COMMAND, functionName);
    await Promise.all(fns.filter((fn) => {
      const config = this.serverless.service.functions[fn];
      return !isPluginDisabled(config);
    }).map(async (fn) => {
      try {
        await runScript(BUILD_COMMAND, fn);
      } catch (error) {
        this.serverless.cli.log(`Building function ${fn} failed.`);
        throw error;
      }
    }));
  };

  packageCleanup = async () => {
    await this.serverless.pluginManager.spawn('clean');
  };

  beforePackageFunction = async () => {
    await this.serverless.pluginManager.spawn('clean');
    await this.serverless.pluginManager.spawn('build');
  };

  beforeCreateDeploymentArtifacts = async () => {
    await this.serverless.pluginManager.spawn('build');
  };

  addFunction = async () => {
    this.serverless.cli.log(`Adding function ${this.options.name}`);
    await addFunction(this.serverless, this.options);
  }

  removeFunction = async () => {
    this.serverless.cli.log(`Removing function ${this.options.name}`);
    await removeFunction(this.serverless, this.options);
  }

  // List of all lifecycle events:
  // https://gist.github.com/HyperBrain/50d38027a8f57778d5b0f135d80ea406
  hooks = {
    // Built-in lifecycle events
    'package:cleanup': this.packageCleanup,
    'before:package:function:package': this.beforePackageFunction,
    'before:package:createDeploymentArtifacts': this.beforeCreateDeploymentArtifacts,

    // Custom lifecycle events
    'function:add:add': this.addFunction,
    'function:remove:remove': this.removeFunction,
    'build:build': this.build,
    'clean:clean': this.clean
  };
}

module.exports = ServerlessNodejsIndividuallyPlugin;
