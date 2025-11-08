/************************************************************************************
 * 
 * llmConstants.ts
 * 
 * LLM default configuration constants.
 * 
 * (C) 2025 Elijah Morgan & Zachary Kurmas
 * *********************************************************************************/
export const llmDefaults = {
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
};

export const geminiDefaults = {
    model: 'gemini-1.5-pro',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
};
