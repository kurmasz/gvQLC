/************************************************************************************
 * 
 * promptLLM.ts
 * 
 * LLM provider abstractions, follows OpenAI API structure as it's supported by several LLM providers.
 * 
 * Once it's mature, future developers may consider changing to the LangChain framework.
 * 
 * (C) 2025 Elijah Morgan & Zachary Kurmas
 * *********************************************************************************/
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

//TODO Implement cofidence testing

export interface LLMConfig {
  provider: 'openai' | 'azure' | 'anthropic' | 'ollama' | 'gemini';
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateCompletion(messages: LLMMessage[]): Promise<LLMResponse>;
}

/* Non-functional, example LangChain implementation
export class LangChainProvider implements LLMProvider {
  async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
    // Wrap LangChain here
  }
}
*/

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    const baseURLMap: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      azure: config.baseURL || '', // Azure requires custom endpoint
      anthropic: 'https://api.anthropic.com/v1',
      ollama: config.baseURL || 'http://localhost:11434/v1'
    };

    this.client = new OpenAI({
      baseURL: config.baseURL || baseURLMap[config.provider],
      apiKey: config.apiKey || 'dummy-key-for-local'
    });

    const defaultModels: Record<string, string> = {
      openai: 'gpt-5-nano-2025-08-07',
      azure: 'gpt-5-nano-2025-08-07',
      anthropic: 'claude-sonnet-4-20250514',
      ollama: 'llama3'
    };

    this.model = config.model || defaultModels[config.provider];
  }

  async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  }
}

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.0-flash-exp';
  }

  async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
    // Separate system message from user/assistant messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Get the generative model with system instruction
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemMessage?.content
    });

    // Convert messages to Gemini format
    const contents = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Generate content
    const result = await model.generateContent({
      contents: contents
    });

    const response = result.response;
    const text = response.text();

    return {
      content: text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    };
  }
}
