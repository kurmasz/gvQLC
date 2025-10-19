/************************************************************************************
 *
 * configFile.ts
 *
 * Creation and management of the config file
 *
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from 'path';

import { configFileName } from "./sharedConstants";
import { ConfigData } from "./types";
import * as gvQLC from "./gvQLC";
import { logToFile } from './fileLogger';

const defaultConfig : ConfigData = {
    submissionRoot: '.',
    title: "<<Title>>",
    topic: "<<Topic>>",
    pl_ready: false,
    pl_root: "/Users/jones/Documents/Courses/CIS500/pl-gvsu-cis500dev-master",
    pl_question_root: "PersonalQuiz",
    pl_assessment_root: "courseInstances/TemplateCourseInstance/assessments",
    pl_quiz_folder: "qlcQuiz0",
    set: "Custom Quiz",
    number: "0",
    points_per_question: 10,
    startDate: "2025-03-22T10:30:00",
    endDate: "2025-03-22T16:30:40",
    timeLimitMin: 30,
    daysForGrading: 7,
    reviewEndDate: "2025-04-21T23:59:59",
    password: "letMeIn",
    language: "python",
    studentNameMapping: {
      smithj: "smithj@example.com"
    },
  };

function getConfigURI() {
  return vscode.Uri.joinPath(gvQLC.workspaceRoot().uri, configFileName);
}

export async function loadConfigData(
  onCreate?: (configName: string) => void
): Promise<ConfigData> {
  const configURI = getConfigURI();
  if (fs.existsSync(configURI.fsPath)) {
    const fileData = await vscode.workspace.fs.readFile(configURI);
    const config = JSON.parse(fileData.toString()) as ConfigData;
    return config;
  } else {
    const config = await createConfigFile(configURI, onCreate);
    return config !== undefined ? config : defaultConfig;
  }
}

export async function createConfigFile(
  configURI: vscode.Uri = getConfigURI(),
  onCreate?: (configName: string) => void
): Promise<ConfigData | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    logToFile('Leaving createConfigFile because there are no workspace folders');
    vscode.window.showErrorMessage("Unable to create config file: No workspace is open.");
    return undefined;
  }

  // const workspaceRoot = workspaceFolders[0].uri.fsPath;
  // const configPath = path.join(workspaceRoot, configFileName);
  const configPath = configURI.fsPath;

  if (fs.existsSync(configPath)) {
    logToFile('Config path already exists');
    const overwrite = await vscode.window.showWarningMessage(
      "Config file already exists. Overwrite?",
      { modal: true },
      "Yes",
      "No"
    );

    if (overwrite !== "Yes") {
      logToFile('Exit createConfigFile without creating becuase user declined to overwrite.');
      return undefined;
    }
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  } catch (err) {
    logToFile(`Writing of config file ${path.join(configPath)} failed:`);
    logToFile(err);
    throw err;
  }

  if (onCreate) {
    onCreate(configPath);
  } else {
    vscode.window.showInformationMessage(`Config file created: ${configPath}`);
  }
  logToFile('Creation of config file successful');
  logToFile(defaultConfig);
  return defaultConfig;
}

export async function openConfigFileEditTab() {

  const doc = await vscode.workspace.openTextDocument(getConfigURI());

    // Open the document in a new editor beside the active one
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
}
