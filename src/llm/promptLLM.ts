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

//TODO Implement cofidence testing
//TODO Add Gemini support

export interface LLMConfig {
  provider: 'openai' | 'azure' | 'anthropic' | 'ollama';
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
      openai: 'gpt-4',
      azure: 'gpt-4',
      anthropic: 'claude-3-5-sonnet-20241022',
      ollama: 'llama3.1'
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
