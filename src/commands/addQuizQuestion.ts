/************************************************************************************
 * 
 * addQuizQuestion.ts
 * 
 * The addQuizQuestion command.
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { state, config, context } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { getLLMProvider } from '../llm/llmConfig';

/**
 * Generates a quiz question from code using the LLM
 */
async function generateQuestionFromCode(code: string): Promise<string> {
    try {
        // Load the prompt template from the extension's directory
        // In development: extensionPath/src/llm/prompts/generateQuestion.json
        // In production: extensionPath/out/src/llm/prompts/generateQuestion.json
        const ctx = context();
        let promptPath = path.join(ctx.extensionPath, 'out', 'src', 'llm', 'prompts', 'generateQuestion.json');
        
        // Fallback to src/ for development/debugging
        try {
            await fs.access(promptPath);
        } catch {
            promptPath = path.join(ctx.extensionPath, 'src', 'llm', 'prompts', 'generateQuestion.json');
        }
        
        const promptContent = await fs.readFile(promptPath, 'utf-8');
        const promptTemplate = JSON.parse(promptContent);

        // Replace the code placeholder in the user prompt
        const userPrompt = promptTemplate.user.replace('{{code}}', code);

        // Get the appropriate LLM provider based on configuration
        const provider = await getLLMProvider(context());

        // Generate the completion
        const response = await provider.generateCompletion([
            { role: 'system', content: promptTemplate.system },
            { role: 'user', content: userPrompt }
        ]);

        return response.content;
    } catch (error) {
        console.error('Error generating question from code:', error);
        throw new Error(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const addQuizQuestionCommand = vscode.commands.registerCommand('gvqlc.addQuizQuestion', async () => {
    console.log('Begin addQuizQuestion.');

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

    // Get highlighted code from student's file
    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('gvQLC: No code selected. (You must have a code snippet selected to add a quiz question.)');
        return;
    }
    const startLine = selection.start.line;
    const newStart = new vscode.Position(startLine, 0);
    const range = new vscode.Range(newStart, selection.end);
    let selectedText = editor.document.getText(range);

    const numTrim = selectedText.length - selectedText.trimStart().length;
    const tokens = selectedText.split("\n");
    tokens.forEach((element, index) => {
        tokens[index] = element.slice(numTrim);
    });
    const trimmedText = tokens.join("\n");

    // Get workspace root and calculate relative path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = editor.document.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, absolutePath);
    var fullFileContent;

    const settingUri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/userSettings.json`);
    try {
        await vscode.workspace.fs.stat(settingUri);
    } catch (error) {
        await Util.saveUserSettingsFile('userSettings.json', 'normal', 'normal');
    }
    var darkMode = "";
    var contrastMode = "";
    const settingBytes = await vscode.workspace.fs.readFile(settingUri);
    const settingsString = Buffer.from(settingBytes).toString('utf8');
    const settingsJSON = await JSON.parse(settingsString);
    darkMode = settingsJSON.darkMode;
    contrastMode = settingsJSON.contrastMode;

    // Get existing questions for suggestions
    let existingQuestions = [];
    try {
        const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${quizQuestionsFileName}`);
        const fileContent = await vscode.workspace.fs.readFile(uri);
        const data = JSON.parse(fileContent.toString());
        existingQuestions = data.data.map((item: { text: string; }) => item.text).filter(Boolean);

        const specUri = vscode.Uri.file(`${absolutePath}`);
        const specContent = await vscode.workspace.fs.readFile(specUri);
        fullFileContent = specContent.toString();
    } catch (error) {
        console.log('Could not load existing questions:', error);
    }

    // Create a Webview Panel for adding a personalized question
    const panel = vscode.window.createWebviewPanel(
        'addPersonalizedQuestion',
        'Add Quiz Question',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // Data passed to the mustache template
    const htmlData = {
        selectedText: trimmedText,
        existingQuestions: JSON.stringify(existingQuestions),
        fullFileContent: fullFileContent,
        darkMode: darkMode,
        contrastMode: contrastMode
    };
    // HTML content for the Webview
    panel.webview.html = Util.renderMustache('addQuestion.mustache.html', htmlData);

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'submitQuestion') {
            const questionData = {
                filePath: relativePath, // Using relative path here
                range: {
                    start: { line: selection.start.line, character: selection.start.character },
                    end: { line: selection.end.line, character: selection.end.character },
                },
                text: message.question,
                highlightedCode: message.editedCode,
                answer: message.answer,
                excludeFromQuiz: false
            };

            // Save to personalizedQuestions.json
            state.personalizedQuestionsData.push(questionData);
            await Util.saveDataToFile(quizQuestionsFileName, state.personalizedQuestionsData);

            vscode.window.showInformationMessage('Question added successfully.');
            panel.dispose();
        } else if (message.type === 'generateQuestion') {
            try {
                // Use the LLM to generate a question from the code
                const generatedContent = await generateQuestionFromCode(message.code);
                
                // Send the response back to the webview
                panel.webview.postMessage({
                    type: 'aiResponse',
                    content: generatedContent
                });
            } catch (error) {
                console.error('Error generating question:', error);
                
                // Send error back to the webview
                panel.webview.postMessage({
                    type: 'aiError',
                    error: error instanceof Error ? error.message : 'Unknown error occurred'
                });
            }
        }

        if (message.type === 'alterUserSettings') {
            await Util.saveUserSettingsFile('userSettings.json', message.darkMode, message.contrastMode);
        }
    });
});
