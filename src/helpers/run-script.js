import { spawn } from "child-process-promise";
import path from "path";
import { FUNCTIONS_BASE_FOLDER } from "./get-function-folders";

const {
  env: { SLS_DEBUG }
} = process;

export function runScript(script, folder) {
  return spawn("yarn", [script], {
    cwd: path.join(FUNCTIONS_BASE_FOLDER, folder),
    stdio: SLS_DEBUG === "*" ? "inherit" : "ignore"
  });
}
