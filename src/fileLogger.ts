/************************************************************************************
 *
 * fileLogger.ts
 *
 * Log to a file (because seeing the output of console.log statements in the extension
 * during automated tests is difficult).
 *
 * This code is also used by the tests, so don't include any packages that require
 * the vscode framework (e.g., vscode)
 *
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import * as path from 'path';
import * as fs from 'fs';

export const logFileName = path.join(require('os').tmpdir(), 'gvQLC_log.txt');
export function logToFile(msg: unknown): void {
  let output: string;

  if (typeof msg === 'string'|| typeof msg === 'number') {
    output = String(msg);
  } else {
    try {
      output = JSON.stringify(msg, null, 2); // pretty-print objects
    } catch {
      output = String(msg); // fallback if JSON.stringify fails (e.g., circular refs)
    }
  }

  fs.appendFileSync(logFileName, `${output}\n`);
}

const logFlags = {
  logFileInitialized: false,
};

function initLogFile() {
  console.log(`*** The log file: ${logFileName}`);
  logToFile("**********************************************************");
  logToFile("**********************************************************");
  logToFile(new Date().toLocaleString());
  logToFile("\n");
  logFlags.logFileInitialized = true;
}

if (!logFlags.logFileInitialized) {
  initLogFile();
}
