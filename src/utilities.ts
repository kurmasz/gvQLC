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

import TurndownService from 'turndown';

import * as gvQLC from './gvQLC';
import { GVQLC, ViewColors, configFileName, quizQuestionsFileName } from './sharedConstants';

import { ConfigData } from './types';

import {logToFile} from './fileLogger';


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
    const rawInput = fs.readFileSync(filePath, 'utf-8');
    const parsedInput = JSON.parse(rawInput);
    if (typeof parsedInput === 'string' || Array.isArray(parsedInput)) {
      return parsedInput;
    } else {
      return parsedInput.data;
    }
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

export async function loadPersistedData() {
  const state = gvQLC.state;
  if (state.dataLoaded) {
    console.log("Data Loaded");
    return true;
  }
  if (verifyAndSetWorkspaceRoot()) {
    console.log("Get from files", quizQuestionsFileName);
    logToFile(`(Re)Loading personalized Questoins data from ${quizQuestionsFileName}`);
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
  
  // timestamp and uniqID are used so the automated tests can be confident that the 
  // previous operation has completed (e.g., detect when the file being read is an old 
  // version).
  const toWrite = {
    data: data,
    timestamp: new Date().toISOString(),
    uniqID: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  };
  
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const output = useJSON ? JSON.stringify(toWrite, null, 2) : data;
  const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${filename}`);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(output));
}

export async function saveUserSettingsFile(filename: string, darkMode: any, contrastMode: any, useJSON = true) {
  
  // timestamp and uniqID are used so the automated tests can be confident that the 
  // previous operation has completed (e.g., detect when the file being read is an old 
  // version).
  const toWrite = {
    darkMode: darkMode,
    contrastMode: contrastMode,
    timestamp: new Date().toISOString(),
    uniqID: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  };
  
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const output = useJSON ? JSON.stringify(toWrite, null, 2) : JSON.stringify({darkMode: darkMode, contrastMode: contrastMode});
  const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${filename}`);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(output));
}

// Function to generate HTML quiz string export for a student
export function generateHTMLQuizExport(studentName: string, questions: any[]): string {
  let retHTML = "";
  const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Export for ${studentName}</title>
  <style>
    .global-body {
      font-family: "Times New Roman", Times, serif;
      margin: 0px;
      padding: 0px;
    }
    .quiz-info {
      margin: 0 20px;
      .quiz-title {
        text-align: center;
        margin: 0;
      }
    }
    .quiz-body {
      margin: 0 20px;
      padding: 0;
      .quiz-question {

        .quiz-number {
          margin: 0;
          font-weight: bold;
        }
        .quiz-text {
          margin: 10px 20px;
        }
        .quiz-code {
          margin: 0 40px;
        }
        .quiz-answer {
          margin: 100px 20px 10px 20px;
          font-weight: bold;
        }
      }
    }
  </style>
</head>
<body class="global-body">`;

  const footer = `</body>
</html>`;

  retHTML += header;
  
  // Info section
  // TODO: add more info (date, instructor, course, etc.)
  let infoSection = `<div class="quiz-info">`;
  infoSection += `<h1 class="quiz-title">Quiz for ${studentName}</h1><hr>\n`;
  const dueDateFlag = true;
  const tempDueDate = "Due Date: ____________";
  if (dueDateFlag) {
    infoSection += `<p>${tempDueDate}</p>`;
  }
  const descFlag = true;
  const tempDesc = "Please answer the following questions based on your code submissions. Write your answers in the space provided.";
  if (descFlag) {
    infoSection += `<p>${tempDesc}</p>`;
  }
  infoSection += `</div>`
  retHTML += infoSection;

  // Questions section
  let quizBody = `<div class="quiz-body">`;
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    let questionBlock = `<div class="quiz-question">`;
    const sampleFileName = "File: " + "test.py";
    const sampleLineRange = "Lines: " + "1-10";
    const sampleColRange = "Columns: " + "1-20";
    //questionBlock += `<p class="quiz-number">${i + 1}. <span>${sampleFileName} ${sampleLineRange}</span></p>`;
    questionBlock += `<p class="quiz-number">${i + 1}. ${sampleFileName} ${sampleLineRange}</p>`;
    questionBlock += `<p class="quiz-text">${question.question}</p>`;
    questionBlock += `<pre class="quiz-code"><code>${question.codeContext}</code></pre>`;
    questionBlock += `\n\n\n`;
    questionBlock += `<p class="quiz-answer">Answer: ${question.answer}</p>`;
    questionBlock += `</div>`;
    quizBody += questionBlock;
  }
  quizBody += `</div>`;
  retHTML += quizBody;
  retHTML += footer;
  return retHTML;
}

// Function to generate HTML quiz for all students in one file
export function generateAllHTMLQuizExport(studentQuestionsMap: Record<string, any[]>): string {
  let retHTML = "";
  retHTML += `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Students Quiz</title>
  <style>
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>`;
  for (const studentName in studentQuestionsMap) {
    const questions = studentQuestionsMap[studentName];
    retHTML += `<h1>Quiz for ${studentName}</h1>\n`;
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      retHTML += `<div class="question-block">\n`;
      retHTML += `<h2>Question ${i + 1}:</h2>\n`;
      retHTML += `<pre><code>${question.codeContext}</code></pre>\n`;
      retHTML += `<p>${question.question}</p>\n`;
      retHTML += `</div>\n<hr>\n`;
    }
    retHTML += `<div class="page-break">&nbsp;</div>\n`;
  }
  retHTML += `</body>
</html>`;
  return retHTML;
}

// Function to convert HTML to Markdown
export function convertHTMLToMarkdown(htmlContent: string): string {
  const turndownService = new TurndownService();
  const markdown = turndownService.turndown(htmlContent);
  return markdown;
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