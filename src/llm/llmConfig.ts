/************************************************************************************
 * 
 * llmConfig.ts
 * 
 * Utilities for managing LLM configuration including secure API key storage.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';
import { LLMConfig, LLMProvider, OpenAICompatibleProvider, GeminiProvider } from './promptLLM';

const API_KEY_SECRET_KEY = 'gvqlc.llm.apiKey';

/**
 * Gets the LLM configuration from VS Code settings and SecretStorage
 */
export async function getLLMConfig(context: vscode.ExtensionContext): Promise<LLMConfig> {
    const config = vscode.workspace.getConfiguration('gvqlc.llm');
    
    // Get provider from settings
    const provider = config.get<'openai' | 'azure' | 'anthropic' | 'ollama' | 'gemini'>('provider') || 'gemini';
    
    // Get API key from secure storage
    const apiKey = await context.secrets.get(API_KEY_SECRET_KEY);
    
    // Get optional settings
    const baseURL = config.get<string>('baseURL');
    const model = config.get<string>('model');
    
    return {
        provider,
        apiKey: apiKey || undefined,
        baseURL: baseURL || undefined,
        model: model || undefined
    };
}

/**
 * Creates the appropriate LLM provider based on configuration
 */
export async function getLLMProvider(context: vscode.ExtensionContext): Promise<LLMProvider> {
    const config = await getLLMConfig(context);
    
    // Check if API key is available (not required for Ollama)
    if (!config.apiKey && config.provider !== 'ollama') {
        throw new Error('No API key configured. Please run "gvQLC: Set LLM API Key" command first.');
    }
    
    // Create the appropriate provider
    if (config.provider === 'gemini') {
        return new GeminiProvider(config);
    } else {
        return new OpenAICompatibleProvider(config);
    }
}

/**
 * Sets the LLM API key securely in VS Code's SecretStorage
 */
export async function setLLMApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
    await context.secrets.store(API_KEY_SECRET_KEY, apiKey);
}

/**
 * Removes the stored LLM API key
 */
export async function clearLLMApiKey(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete(API_KEY_SECRET_KEY);
}

/**
 * Checks if an API key is stored
 */
export async function hasLLMApiKey(context: vscode.ExtensionContext): Promise<boolean> {
    const apiKey = await context.secrets.get(API_KEY_SECRET_KEY);
    return !!apiKey;
}
