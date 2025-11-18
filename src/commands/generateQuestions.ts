
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { state, config, context } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { getLLMProvider } from '../llm/llmConfig';

// use one LLM call to generate multiple questions
// vvv figure out output format/type
async function generateAllInOne(code: string, userPrompt: string): Promise<string[]> {

    return [];
}

export const generateQuestionsCommand = vscode.commands.registerCommand('gvqlc.generateQuestions', async () => {
    if (!Util.loadPersistedData()) {
        return;
    }
    
    // Make sure student file is open
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)');
        vscode.window.setStatusBarMessage(
            "gvQLC: No active editor tab. (You must have a code snippet selected to add a quiz question.)",
            7000
        );
        return;
    }

    // Get whole document text from student's file
    const studentCode = editor.document.getText();
    // vvv check if length actually works here
    if (!studentCode || studentCode.length === 0) {
        vscode.window.showErrorMessage('gvQLC: The active document is empty. Please open a file with code to generate quiz questions.');
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'generateQuestions',
        'Generate Quiz Questions',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    
    // vvv figure out how to store this
    let generatedQuestions = null;
    const htmlData = {
        questions: generatedQuestions
    };
    panel.webview.html = Util.renderMustache('generateQuestions.mustache.html', htmlData);

    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'generate') {
            // vvv assign to our state questions var
            //generateAllInOne(studentCode, message.userPrompt);
            const generatedQuestions = "test q1";
            // display questions on view
            panel.webview.postMessage({
                type: 'displayQuestions',
                questions: generatedQuestions
            });
        }
    })
});