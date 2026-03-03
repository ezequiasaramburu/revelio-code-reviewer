import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, LLMResponse, ProviderConfig } from '../types';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly model: string;
  private client: Anthropic;
  private maxTokens: number;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async complete(messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> {
    const res = await this.client.messages.create({
      model: this.model, max_tokens: this.maxTokens,
      system: systemPrompt, messages,
    });
    const content = res.content.filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text).join('');
    return { content, model: res.model,
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
  }
}