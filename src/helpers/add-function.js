import fs from 'fs';
import rmfr from 'rmfr';
import yaml from 'js-yaml';
import mkdir from 'mkdirp';
import dashify from 'dashify';
import path from 'path';
import ncp from './ncp';
import { FUNCTIONS_BASE_FOLDER } from './get-function-folders';
import { runScript } from './run-script';
import { FN_PACK_INCLUDE_DEFAULT, FN_ENV_DEFAULT } from './default-options';

const FN_TEMPLATE_BASE_FOLDER = path.join(__dirname, '..', '..', 'function-template');
const DEFAULT_FN_TEMPLATE_FOLDER = path.join(FN_TEMPLATE_BASE_FOLDER, 'default');
const ORDA_FN_TEMPLATE_FOLDER = path.join(FN_TEMPLATE_BASE_FOLDER, 'ORDA');

function createFunctionConfig(functionName) {
  return {
    handler: `${FUNCTIONS_BASE_FOLDER}/${functionName}/build/index.handler`,
    package: {
      include: FN_PACK_INCLUDE_DEFAULT(functionName)
    },
    environment: FN_ENV_DEFAULT(functionName)
  };
}

function splittedFunctionConfig(functionName) {
  return yaml.safeDump({
    [functionName]: createFunctionConfig(functionName)
  })
    .split('\n')
    .map((str) => {
      if (
        str.includes('handler:') ||
        str.includes(`${functionName}:`) ||
        str.trim() === ''
      ) {
        return `  ${str}`;
      }

      // Find first non whitespace character
      let i;
      for (i = 0; i < str.length; i++) {
        if (str[i] !== ' ') {
          break;
        }
      }
      return `${str.substr(0, i)}# ${str.substr(i, str.length)}`;
    });
}

export async function addFunction(serverless, options) {
  const functionName = options.name;

  // Create function folder
  const targetDir = path.join(FUNCTIONS_BASE_FOLDER, functionName);

  // Check if folder or function entry already exists
  if (fs.existsSync(targetDir)) {
    throw new Error('Function folder already exists!');
  }

  if (serverless.service.functions && serverless.service.functions[functionName]) {
    throw new Error('Function already exists in serverless.yml!');
  }

  // Create target folder
  mkdir.sync(targetDir);

  // Copy default files into function folder
  await ncp(DEFAULT_FN_TEMPLATE_FOLDER, targetDir);

  // Overwrite template if requested
  if (options.ORDA) {
    await ncp(ORDA_FN_TEMPLATE_FOLDER, targetDir);
  }

  // Write name in package.json
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
  delete packageJson.name;

  const newPackageJson = {
    name: dashify(functionName),
    ...packageJson
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));

  // Add function to .serverless.yml
  const serverlessYmlPath = path.join(process.cwd(), 'serverless.yml');
  const serverlessYml = fs.readFileSync(serverlessYmlPath).toString();
  const splittedYml = serverlessYml.split('\n');
  let newSplittedYml;
  for (let i = 0; i < splittedYml.length; i++) {
    if (splittedYml[i].startsWith('functions:')) {
      newSplittedYml = [
        ...splittedYml.slice(0, i + 1),
        ...splittedFunctionConfig(functionName),
        ...splittedYml.slice(i + 1, splittedYml.length)
      ];
    }
  }

  if (!newSplittedYml) {
    newSplittedYml = [
      ...splittedYml,
      'functions:',
      ...splittedFunctionConfig(functionName)
    ];
  }

  fs.writeFileSync(serverlessYmlPath, newSplittedYml.join('\n'));

  // Install dependencies
  await runScript('install', functionName);
}

export async function removeFunction(serverless, options) {
  const functionName = options.name;

  // Check if folder exists
  const targetDir = path.join(FUNCTIONS_BASE_FOLDER, functionName);
  if (!fs.existsSync(targetDir)) {
    throw new Error('Function folder does not exist!');
  }

  // Check if function reference exists
  if (!serverless.service.functions[functionName]) {
    throw new Error('Function does not exist in serverless.yml');
  }

  // Remove function folder
  await rmfr(targetDir);

  // Remove function entry from serverless yml
  // Add function to .serverless.yml
  const serverlessYmlPath = path.join(process.cwd(), 'serverless.yml');
  const serverlessYml = fs.readFileSync(serverlessYmlPath).toString();
  const splittedYml = serverlessYml.split('\n');
  let startIndex = 0;
  let endIndex = 0;
  for (let i = 0; i < splittedYml.length; i++) {
    if (startIndex) {
      const startOfExpression = splittedYml[i].substr(0, 3);
      if (
        startOfExpression[0] === ' ' &&
        startOfExpression[1] === ' ' &&
        startOfExpression[2] !== ' ' &&
        startOfExpression[2] !== '#'
      ) {
        endIndex = i;
        break;
      }
    }
    if (splittedYml[i].includes(`${functionName}:`)) {
      startIndex = i;
    }
  }

  const newSplittedYml = [
    ...splittedYml.slice(0, startIndex),
    ...splittedYml.slice(endIndex, splittedYml.length)
  ];

  fs.writeFileSync(serverlessYmlPath, newSplittedYml.join('\n'));
}
