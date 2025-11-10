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

/**
 * Sleeps for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if an error is a rate limit error (429)
 */
function isRateLimitError(error: any): boolean {
  return error?.status === 429 || 
         error?.statusCode === 429 ||
         error?.code === 429 ||
         (error?.message && error.message.includes('429')) ||
         (error?.message && error.message.toLowerCase().includes('rate limit'));
}

/**
 * Transforms Gemini API errors into user-friendly messages
 */
function parseGeminiError(error: any): Error {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorStatus = error?.status || error?.statusCode || error?.code;

  // Invalid API key
  if (errorStatus === 400 && (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key'))) {
    return new Error('Invalid Gemini API key. Please run "gvQLC: Set LLM API Key" command with a valid API key from https://makersuite.google.com/app/apikey');
  }

  // Quota/billing issues
  if (errorStatus === 403 || errorMessage.includes('quota') || errorMessage.includes('billing')) {
    return new Error('Gemini API quota exceeded or billing not enabled. Check your Google Cloud project at https://console.cloud.google.com/');
  }

  // Model not found
  if (errorStatus === 404 || errorMessage.includes('models/') || errorMessage.includes('not found')) {
    return new Error(`Gemini model not found. The model may not exist or you may not have access. Check your model name in settings.`);
  }

  // Rate limit (should be caught by retry logic, but just in case)
  if (isRateLimitError(error)) {
    return new Error('Gemini API rate limit exceeded. Please try again in a moment.');
  }

  // Network/timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNREFUSED')) {
    return new Error('Network error connecting to Gemini API. Check your internet connection and try again.');
  }

  // Safety filters
  if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
    return new Error('Content was blocked by Gemini safety filters. Try rephrasing your code or prompt.');
  }

  // Generic error with more context
  return new Error(`Gemini API error: ${errorMessage}`);
}

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
      apiKey: config.apiKey || 'dummy-key-for-local',
      timeout: 60000, // 60 second timeout
      maxRetries: 2    // Retry failed requests up to 2 times
    });

    const defaultModels: Record<string, string> = {
      openai: 'gpt-5-nano-2025-08-07',
      azure: 'gpt-5-nano-2025-08-07',
      anthropic: 'claude-haiku-4-5-20251001',
      ollama: 'llama3'
    };

    this.model = config.model || defaultModels[config.provider];
  }

  async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        });

        // Validate response has content
        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('LLM returned no content. Check your API key and model configuration.');
        }

        return {
          content: content,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          }
        };
      } catch (error: any) {
        lastError = error;
        
        // Check if this is a rate limit error and we have retries left
        if (isRateLimitError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        
        // For other errors or no retries left, throw immediately
        throw error;
      }
    }
    
    // Should never reach here, but TypeScript needs this
    throw lastError;
  }
}

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;
  private readonly timeout: number = 60000; // 60 second timeout

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.5-flash';
  }

  async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
    // Validate input
    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required');
    }

    // Separate system message from user/assistant messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Ensure we have at least one conversation message
    if (conversationMessages.length === 0) {
      throw new Error('At least one user or assistant message is required (system-only messages are not supported)');
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
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

        // Generate content with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Gemini API request timed out after 60 seconds')), this.timeout);
        });

        const result = await Promise.race([
          model.generateContent({ contents }),
          timeoutPromise
        ]);

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
      } catch (error: any) {
        lastError = error;
        
        // Check if this is a rate limit error and we have retries left
        if (isRateLimitError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Gemini rate limit hit, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        
        // For other errors or no retries left, parse and throw user-friendly error
        throw parseGeminiError(error);
      }
    }
    
    // Should never reach here, but TypeScript needs this
    throw parseGeminiError(lastError);
  }
}
