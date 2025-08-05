import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export const logFileName = path.join(os.tmpdir(), 'gvQLC_log.txt');
export function logToFile(msg: string) {
  fs.appendFileSync(logFileName, `${msg}\n`);
}
