/************************************************************************************
 *
 * plHelpers.ts
 *
 * Helpers for systems tests of PrairieLearn quiz generation
 *
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import * as fs from "fs";
import * as path from "path";

import { expect } from "chai";

// Set the pl_root of the config file under test.
// pl_root is assumed to be an absolute path name, so this needs to be
// set at run time (since we don't know where in the developer's file system
// the source tree will be installed.)
export async function setPLRoot(configFilePath: string, plPath: string) {
  const data = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
  data.pl_root = plPath;
  fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2));
}

export function verifyDirectoryExists(parts: string[]) {
  const testPath = path.join(...parts);
  expect(fs.existsSync(testPath), `${testPath} does not exist`).to.be.true;
  expect(fs.statSync(testPath).isDirectory(), `${testPath} is not a directory`)
    .to.be.true;
}

function verifyDirectoryContentsBase(parts: string[], expected: string[]) {
  verifyDirectoryExists(parts);
  const testPath = path.join(...parts);
  const contents = fs.readdirSync(testPath);
  for (const item of expected) {
    expect(contents.includes(item), `${testPath} does not include ${item}`).to
      .be.true;
  }
  return { testPath, contents };
}

export function verifyDirectoryContents(
  parts: string[],
  expected: string[],
  unexpected: string[] = []
) {
  const { testPath, contents } = verifyDirectoryContentsBase(parts, expected);
  for (const item of unexpected) {
    expect(contents.includes(item), `${testPath} should not include ${item}`).to
      .be.false;
  }
}

export function verifyExactDirectoryContents(
  parts: string[],
  expected: string[]
) {
  const { testPath, contents } = verifyDirectoryContentsBase(parts, expected);
  for (const item of contents) {
    expect(expected.includes(item), `${testPath} should not include ${item}`).to
      .be.true;
  }
}
