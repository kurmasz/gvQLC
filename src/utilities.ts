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

import { GVQLC, quizQuestionsFileName, state, context } from './gvQLC';
// import {logToFile} from './fileLogger';


function _primaryFolderPath() {
  return vscode.workspace.workspaceFolders![0].uri.fsPath;
}

export function verifyWorkspaceHasSingleFolder() {
  if (!vscode.workspace.workspaceFolders) {

    // We only want to see this error as a modal once.
    // After that, other attempts to run commands should simply 
    // display a notification. 
    const message = `${GVQLC} requires a workspace folder to be open.`;
    if (state.modalErrorDisplayed) {
      vscode.window.showErrorMessage(message);
    } else {
      console.log("===========> Displaying modal error");
      // Modal error messages don't play nice with the automated tester, 
      // so we switch them to headless.
      const isTestEnv = process.env.VSCODE_TEST_ZK === 'true';
      const modalMessage = isTestEnv ? message + ' (modal)' : message;
      vscode.window.showErrorMessage(modalMessage, { modal: !isTestEnv }, "OK");
      state.modalErrorDisplayed = true;
    }
    return false;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (folders.length > 1) {
    vscode.window.showWarningMessage(`${GVQLC} expects a workspace with a single folder. Loading/Saving data from ${_primaryFolderPath()}.`);
    return false;
  }
  return true;
}

// Start here


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

// TODO: Remove any
export function extractStudentName(filePath: string, config?: any) {
  const parts = filePath.split(path.sep);
  let studentName = 'unknown_user';
  let quizDirectoryName = 'cis'; // default fallback

  // Try to get quiz_directory_name from config if not provided
  if (!config) {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const configFilenames = ['cqlc.config.json', 'gvqlc.config.json'];
        for (const filename of configFilenames) {
          try {
            const configPath = path.join(workspaceFolders[0].uri.fsPath, filename);
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (configData.quiz_directory_name) {
              quizDirectoryName = configData.quiz_directory_name.toLowerCase();
              break;
            }
          } catch (err) {
            // Config file not found or invalid - continue to next filename
          }
        }
      }
    } catch (error) {
      console.error("Error reading config file:", error);
    }
  } else if (config.quiz_directory_name) {
    quizDirectoryName = config.quiz_directory_name.toLowerCase();
  }

  // Find the student name in the path
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].toLowerCase() === quizDirectoryName.toLowerCase()) {
      studentName = parts[i + 1];
      break;
    }
  }

  // Apply name mapping if available
  if (config && config.studentNameMapping) {
    if (config.studentNameMapping[studentName]) {
      studentName = config.studentNameMapping[studentName];
    }
  }

  return studentName;
}

export function loadPersistedData() {
    if (state.dataLoaded) {
    return true;
  }
  if (verifyWorkspaceHasSingleFolder()) {
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

export function renderMustache(filename: string, data: any): string {
    const templatePath = path.join(context().extensionPath, 'views', filename);
    const template = fs.readFileSync(templatePath, 'utf8');
    const rendered = Mustache.render(template, data);
    return rendered;
}