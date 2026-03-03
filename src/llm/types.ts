export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

// Every provider implements this. The rest of the app only touches this interface.
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  complete(messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse>;
}

export type ProviderName = 'claude' | 'openai' | 'gemini';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey: string;
  model?: string;
  maxTokens?: number;
}