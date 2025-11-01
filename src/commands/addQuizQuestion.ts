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

import { state, config } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';

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
    
    const apiUri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/myAPIKey.json`);
    var apiKey = "";
    const apiBytes = await vscode.workspace.fs.readFile(apiUri);
    const apiString = Buffer.from(apiBytes).toString('utf8');
    const apiJSON = await JSON.parse(apiString);
    apiKey = apiJSON.data;

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
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    // Data passed to the mustache template
    const htmlData = {
        selectedText: trimmedText,
        existingQuestions: JSON.stringify(existingQuestions),
        fullFileContent: fullFileContent,
        apiKey: apiKey,
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
        }
        if (message.type === 'alterUserSettings') {
            await Util.saveUserSettingsFile('userSettings.json', message.darkMode, message.contrastMode);
        }
    });
});
