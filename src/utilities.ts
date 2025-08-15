/************************************************************************************
 * 
 * utilities.ts
 * 
 * Various helper functions for gvQLC
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as Mustache from 'mustache';

import * as gvQLC from './gvQLC';
import { GVQLC, ViewColors, configFileName, quizQuestionsFileName } from './sharedConstants';

import { ConfigData } from './types';

// import {logToFile} from './fileLogger';


function _primaryFolderPath() {
  return vscode.workspace.workspaceFolders![0].uri.fsPath;
}

function verifyAndSetWorkspaceRoot() {
  if (!vscode.workspace.workspaceFolders) {

    // We only want to see this error as a modal once.
    // After that, other attempts to run commands should simply 
    // display a notification. 
    const message = `${GVQLC} requires a workspace folder to be open.`;
    if (gvQLC.state.modalErrorDisplayed) {
      vscode.window.showErrorMessage(message);
    } else {
      console.log("===========> Displaying modal error");
      // Modal error messages don't play nice with the automated tester, 
      // so we switch them to headless.
      const isTestEnv = process.env.VSCODE_TEST_ZK === 'true';
      const modalMessage = isTestEnv ? message + ' (modal)' : message;
      vscode.window.showErrorMessage(modalMessage, { modal: !isTestEnv }, "OK");
      gvQLC.state.modalErrorDisplayed = true;
    }
    return false;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (folders.length > 1) {
    vscode.window.showWarningMessage(`${GVQLC} expects a workspace with a single folder. Loading/Saving data from ${_primaryFolderPath()}.`);
    return false;
  }
  gvQLC.setWorkspaceRoot(folders[0]);
  return true;
}

// Helper function to get the workspace directory
export function getWorkspaceDirectory() {
  if (vscode.workspace.workspaceFolders) {
    return _primaryFolderPath();
  } else {
    throw new Error("No workspace folder found.");
  }
}

// Helper function to load data from a file in the workspace directory
export function loadDataFromFile(fileName: string) {
  const workspaceDir = getWorkspaceDirectory();
  const filePath = path.join(workspaceDir, fileName);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return [];
}

export async function loadConfigData(): Promise<ConfigData> {
  let defaultConfig = {} as ConfigData;
  try {
    let configFileUri = null;
    try {
      const fileUri = vscode.Uri.joinPath(gvQLC.workspaceRoot().uri, configFileName);
      await vscode.workspace.fs.stat(fileUri);
      configFileUri = fileUri;
    } catch (err) { }

    if (configFileUri) {
      const fileData = await vscode.workspace.fs.readFile(configFileUri);
      const config = JSON.parse(fileData.toString()) as ConfigData;
      gvQLC.state.studentNameMapping = config.studentNameMapping || {};
      return config;
    } else {
      // TODO: Test me
      vscode.window.showErrorMessage(
        'No config file found. Press Command + Shift + P and select "Create Sample Config File".',
        { modal: true }
      );
      return defaultConfig;
    }
  } catch (error) {
    // TODO: Is continuing with default config the correct response? 
    vscode.window.showErrorMessage(
      `Error loading config file: ${error instanceof Error ? error.message : String(error)}`
    );
    return defaultConfig;
  }
}

// Helper function to ensure quizQuestionsFileName is added to .gitignore
export function ensureGitignoreForQuizQuestionsFile() {

  // We need to divert this activity in the test environment, otherwise, 
  // the .gitignore file will prevent the CI tests from running properly.
  const isTestEnv = process.env.VSCODE_TEST_ZK === 'true' || !!process.env.VSCODE_DEBUG_MODE;
  const workspaceDir = getWorkspaceDirectory();
  const gitignoreFilename = isTestEnv ? '.test_gitignore' : '.gitignore';
  const gitignorePath = path.join(workspaceDir, gitignoreFilename);

  let gitignoreContent = "";

  // Check if .gitignore exists
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

    // If quizQuestionsFileName is not already in .gitignore, add it
    if (!gitignoreContent.split("\n").includes(quizQuestionsFileName)) {
      gitignoreContent += `\n${quizQuestionsFileName}\n`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
    }
  } else {
    // Create a .gitignore file and add quizQuestionsFileName
    fs.writeFileSync(gitignorePath, `${quizQuestionsFileName}\n`);
  }
}

// TODO Still need to handle error cases (empty filePath, 
// file path does not contain submissionRoot, etc.)
export function extractStudentName(filePath: string, submissionRoot: string | null): string {
  const normalizedPath = path.normalize(filePath);
  const parts = normalizedPath.split(path.sep).filter(part => part.length > 0);

  if (!submissionRoot) {
    return parts[0];
  } else {
    const index = parts.findIndex(part => part === submissionRoot);
    return parts[index + 1];
  }
}


async function extractStudentNameOld(filePath: string, submissionRoot: string) {
  const parts = filePath.split(path.sep);
  let studentName = '<unknown_user>';
  let quizDirectoryName = '.'; // default fallback

  if (submissionRoot) {
    quizDirectoryName = submissionRoot.toLowerCase();
  }

  // Find the student name in the path
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].toLowerCase() === quizDirectoryName.toLowerCase()) {
      studentName = parts[i + 1];
      break;
    }
  }

  // Apply name mapping if available
  const studentNameMapping = (await gvQLC.config()).studentNameMapping;
  if (studentNameMapping) {
    if (studentNameMapping[studentName]) {
      studentName = studentNameMapping[studentName];
    }
  }
  console.log('Student name: ', studentName);
  return studentName;
}

export function loadPersistedData() {
  const state = gvQLC.state;
  if (state.dataLoaded) {
    return true;
  }
  if (verifyAndSetWorkspaceRoot()) {
    state.commentsData.push(...loadDataFromFile('commentsData.json'));
    state.questionsData.push(...loadDataFromFile('questionsData.json'));
    state.personalizedQuestionsData.push(...loadDataFromFile(quizQuestionsFileName));

    // Ensure quizQuestionsFileName is in .gitignore
    ensureGitignoreForQuizQuestionsFile();
    state.dataLoaded = true;
    return true;
  }
  return false;
}

export async function getAllStudentNames(config: ConfigData) {
  const allStudents = new Set<string>();
  let submissionDirectory = gvQLC.workspaceRoot().uri;
  if (config.submissionRoot) {
    submissionDirectory = vscode.Uri.joinPath(submissionDirectory, config.submissionRoot);
  }
  const files = await vscode.workspace.fs.readDirectory(submissionDirectory);
  for (const [name, type] of files) {
    if (type === vscode.FileType.Directory && !name.startsWith('.')) {
      allStudents.add(name);
    }
  }
  return Array.from(allStudents).sort();
}


export function renderMustache(filename: string, data: any): string {
  const templatePath = path.join(gvQLC.context().extensionPath, 'views', filename);
  const template = fs.readFileSync(templatePath, 'utf8');
  const rendered = Mustache.render(template, data);
  return rendered;
}

export async function saveDataToFile(filename: string, data: any, useJSON = true) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  if (useJSON) {
    data = JSON.stringify(data, null, 2);
  }

  const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${filename}`);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(data));
}

export function chooseQuestionColor(numQuestionsForStudent: number, modeQuestionsForStudent: number) {
  if (numQuestionsForStudent === 0) {
    return ViewColors.RED;
  } else if (numQuestionsForStudent > modeQuestionsForStudent) {
    return ViewColors.BLUE;
  } else if (numQuestionsForStudent === modeQuestionsForStudent) {
    return ViewColors.GREEN;
  } else { // if (numQuestionsForStudent < modeQuestionsForStudent)
    return ViewColors.YELLOW;
  }
}