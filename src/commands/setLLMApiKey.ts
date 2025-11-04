/************************************************************************************
 * 
 * setLLMApiKey.ts
 * 
 * Command to securely store LLM API key insystem keychain.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';
import { context } from '../gvQLC';
import { setLLMApiKey, clearLLMApiKey, hasLLMApiKey } from '../llm/llmConfig';

export const setLLMApiKeyCommand = vscode.commands.registerCommand('gvqlc.setLLMApiKey', async () => {
    const existingKey = await hasLLMApiKey(context());
    
    const options = existingKey 
        ? ['Set New API Key', 'Clear Existing API Key', 'Cancel']
        : ['Set API Key', 'Cancel'];
    
    const action = await vscode.window.showQuickPick(options, {
        placeHolder: 'Choose an action'
    });
    
    if (action === 'Cancel' || !action) {
        return;
    }
    
    if (action === 'Clear Existing API Key') {
        await clearLLMApiKey(context());
        vscode.window.showInformationMessage('LLM API key cleared successfully.');
        return;
    }
    
    // Prompt for API key
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your LLM API key',
        password: true,
        placeHolder: 'sk-...',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API key cannot be empty';
            }
            return null;
        }
    });
    
    if (!apiKey) {
        return;
    }
    
    // Store the API key securely
    await setLLMApiKey(context(), apiKey);
    vscode.window.showInformationMessage('LLM API key stored securely.');
});
