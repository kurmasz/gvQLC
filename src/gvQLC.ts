/************************************************************************************
 * 
 * gvQLC.ts
 * 
 * Core gvQLC data and constants
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';
export const GVQLC = 'gvQLC';
export const quizQuestionsFileName = 'gvQLC.quizQuestions.json';
export const configFileName = 'gvQLC.config.json';

// In-memory storage for comments and questions
// TODO: Replace any[] with correct type
export const state = {
    context: null as vscode.ExtensionContext | null,
    commentsData: [] as any [],
    questionsData: [] as any[],
    personalizedQuestionsData: [] as PersonalizedQuestionsData[],
    configData: null as any,
    dataLoaded: false as any,
    modalErrorDisplayed: false as any,
    studentNameMapping: {} as Record<string, string>,
};

export function context() : vscode.ExtensionContext {
    if (!state.context) {
        throw new Error('Extension context has not been initialized yet!');
    }
    return state.context;
}


export type PersonalizedQuestionsData = {
    filePath: string,
    text: string,
    range: {
        start: {line: number, character: number},
        end: {line: number, character: number}
    },
    highlightedCode: string,
    excludeFromQuiz: boolean
};