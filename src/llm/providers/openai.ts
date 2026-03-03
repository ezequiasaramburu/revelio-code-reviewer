import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse, ProviderConfig } from '../types';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private client: OpenAI;
  private maxTokens: number;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4o';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async complete(messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> {
    const res = await this.client.chat.completions.create({
      model: this.model, max_tokens: this.maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });
    return { content: res.choices[0]?.message?.content ?? '', model: res.model,
      usage: { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 } };
  }
}