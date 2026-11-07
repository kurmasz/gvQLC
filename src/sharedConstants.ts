/************************************************************************************
 * 
 * sharedConstants.ts
 * 
 * Constants used by both the extension and the automated tests.
 * 
 * This code is also used by the tests, so don't include any packages that require
 * the vscode framework (e.g., vscode)
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

export const GVQLC = 'gvQLC';
export const quizQuestionsFileName = 'gvQLC.quizQuestions.json';
export const configFileName = 'gvQLC.config.json';

// These highlights overlay the editor surface and retain its foreground color.
// Keep CSS variable references so existing webviews follow theme changes live.
export enum ViewColors {
    RED = 'var(--vscode-diffEditor-removedTextBackground, var(--vscode-editor-background))',
    GREEN = 'var(--vscode-diffEditor-insertedTextBackground, var(--vscode-editor-background))',
    YELLOW = 'var(--vscode-editor-findMatchHighlightBackground, var(--vscode-editor-background))',
    BLUE = 'var(--vscode-editor-wordHighlightBackground, var(--vscode-editor-background))'
};
