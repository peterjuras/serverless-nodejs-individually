import fs from 'fs';
import path from 'path';

const PACKAGE_JSON = 'package.json';
export const FUNCTIONS_BASE_FOLDER = 'functions';

function getFunctionFolder(name, config) {
  return (config.custom && config.custom.rootDir) || name;
}

export function getAllFunctionFolders(serverless, command, filterFn) {
  let filtered = Object.keys(serverless.service.functions);
  if (filterFn) {
    filtered = filtered.filter(name => name === filterFn);
  }

  return filtered.reduce((results, name) => {
    const config = serverless.service.functions[name];
    if (config.custom && config.custom.build === false) {
      return results;
    }

    const fnFolder = getFunctionFolder(name, config);
    const packageJsonPath = path.join(FUNCTIONS_BASE_FOLDER, fnFolder, PACKAGE_JSON);
    if (!fs.existsSync(packageJsonPath)) {
      return results;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
    if (packageJson.scripts && packageJson.scripts[command]) {
      results.push(fnFolder);
    }

    return results;
  }, []);
}
