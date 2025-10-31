/************************************************************************************
 * 
 * addQuizQuestion.ts
 * 
 * The addQuizQuestion command.
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/
import * as vscode from 'vscode';
import { saveDataToFile } from '../utilities';

export const setMyAPIKey = vscode.commands.registerCommand('gvqlc.setMyAPIKey', async () => {
    const value = await vscode.window.showInputBox({
        prompt: 'Enter a secret Gemini API Key',
        password: true,
    });
    if (value) {
        await saveDataToFile('myAPIKey.json', value);
        vscode.window.showInformationMessage('Secret stored successfully!');
    }
});