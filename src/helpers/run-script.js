import { spawn } from 'child-process-promise';
import path from 'path';
import { FUNCTIONS_BASE_FOLDER } from './get-function-folders';

export function runScript(script, folder) {
  return spawn('yarn', [script], {
    cwd: path.join(FUNCTIONS_BASE_FOLDER, folder),
    stdio: 'ignore'
  });
}
