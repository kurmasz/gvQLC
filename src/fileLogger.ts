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
import * as os from 'os';

export const logFileName = path.join(os.tmpdir(), 'gvQLC_log.txt');
export function logToFile(msg: string) {
  fs.appendFileSync(logFileName, `${msg}\n`);
}
