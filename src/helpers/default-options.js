/* eslint-disable no-param-reassign */
import fs from 'fs';
import { select } from './select';
import { isPluginDisabled } from './is-plugin-disabled';
import { FUNCTIONS_BASE_FOLDER } from './get-function-folders';

const PACK_DEVDEP_DEFAULT = false;
const PACK_INDIV_DEFAULT = true;
const PACK_EXCLUDE_DEFAULT = ['**'];

export function FN_PACK_INCLUDE_DEFAULT(fn) {
  return [`${FUNCTIONS_BASE_FOLDER}/${fn}/build/**`];
}
function FN_ENV_DEFAULT_PATH(fn) {
  return `${FUNCTIONS_BASE_FOLDER}/${fn}/.env.yml`;
}
export function FN_ENV_DEFAULT(fn) {
  return `${'$'}{file(${FUNCTIONS_BASE_FOLDER}/${fn}/.env.yml):${'$'}{opt:stage, self:provider.stage}}`;
}

export function insertDefaultOptions(serverless) {
  if (!serverless || !serverless.service) {
    serverless.cli.log('Warning! No service detected! serverless-plugin-nodejs-individually might not function properly.');
    return;
  }

  // Packaging
  if (!serverless.service.package) {
    serverless.service.package = {};
  }

  // Exclude devDependencies
  serverless.service.package.excludeDevDependencies =
    select(serverless.service.package.excludeDevDependencies, PACK_DEVDEP_DEFAULT);

  // Set individually to true
  serverless.service.package.individually =
    select(serverless.service.package.individually, PACK_INDIV_DEFAULT);

  // Set exclude to everything
  serverless.service.package.exclude =
    select(serverless.service.package.exclude, PACK_EXCLUDE_DEFAULT);

  // Function specific defaults
  Object.keys(serverless.service.functions || {}).forEach((fn) => {
    const config = serverless.service.functions[fn];
    if (isPluginDisabled(config)) {
      return;
    }

    if (!config.package) {
      config.package = {};
    }
    config.package.include = select(config.package.include, FN_PACK_INCLUDE_DEFAULT(fn));

    // Environment
    if (
      config.environment === undefined &&
      fs.existsSync(FN_ENV_DEFAULT_PATH(fn))
    ) {
      config.environment = FN_ENV_DEFAULT(fn);
    }
  });
}
