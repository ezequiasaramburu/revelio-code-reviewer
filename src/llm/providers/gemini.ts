import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
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
    const systemInstruction: Content = {
      role: 'user',
      parts: [{ text: systemPrompt }],
    };
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction,
    });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })) as Content[];
    const last = messages.at(-1)!;
    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(last.content);
    const usageMeta = (result.response as any).usageMetadata;
    return {
      content: result.response.text(),
      model: this.model,
      usage: {
        inputTokens: usageMeta?.promptTokenCount ?? 0,
        outputTokens: usageMeta?.candidatesTokenCount ?? 0,
      },
    };
  }
}