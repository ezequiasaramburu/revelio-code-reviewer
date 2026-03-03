import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMMessage, LLMResponse, ProviderConfig } from '../types';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly model: string;
  private client: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model ?? 'gemini-1.5-pro';
  }

  async complete(messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> {
    const genModel = this.client.getGenerativeModel({ model: this.model, systemInstruction: systemPrompt });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }],
    }));
    const result = await genModel.startChat({ history }).sendMessage(messages.at(-1)!.content);
    return { content: result.response.text(), model: this.model,
      usage: { inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
               outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0 } };
  }
}