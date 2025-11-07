/************************************************************************************
 * 
 * gvQLC.ts
 * 
 * Core gvQLC data and constants
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';

import { PersonalizedQuestionsData, ConfigData } from './types';
import { loadConfigData} from './utilities';


// Thoughts 
// * Store filenames relative to project root.
// * Assume each student's submissions are a separate folder in a directory named submissionsRoot

// In-memory storage for comments and questions
// TODO: Replace any[] with correct type
export const state = {
    commentsData: [] as any[],
    questionsData: [] as any[],
    personalizedQuestionsData: [] as PersonalizedQuestionsData[],
    dataLoaded: false as any,
    modalErrorDisplayed: false as any,
    studentNameMapping: {} as Record<string, string>,
};

//
// Extension Context
//
let extensionContext = null as vscode.ExtensionContext | null;
export function context(): vscode.ExtensionContext {
    if (!extensionContext) {
        throw new Error('Extension context has not been initialized yet!');
    }
    return extensionContext;
}

export function setContext(context: vscode.ExtensionContext) {
    extensionContext = context;
}

//
// Workspace Root
//
let globalWorkspaceRoot = null as vscode.WorkspaceFolder | null;
export function workspaceRoot(): vscode.WorkspaceFolder {
    if (!globalWorkspaceRoot) {
        throw new Error('Extension context has not been initialized yet!');
    }
    return globalWorkspaceRoot;
}

export function setWorkspaceRoot(root: vscode.WorkspaceFolder) {
    globalWorkspaceRoot = root;
}

//
// Config
// 
let configData = null as ConfigData | null;
export async function config() : Promise<ConfigData> {
    // Problem:
    //          - config can never be updated without a full vscode window reload
    //          - as it only is loaded in to memory the first time config is called for from a command
    //          - for the period of time in which the extension is using resources
    //          - no big deal for us devs, but a user should be able to change config without a full reload
    // Solution:
    //          - we save to config in export command
    //          - 


    //  honestly, should just load from file every time, no access to configData outside of this file
    // and it needs to be updated by export command, will test this theory.
    if (!configData) {
        console.log("nodata");
        return configData = await loadConfigData();
    } else {
        return configData;
    }
}