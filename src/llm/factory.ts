import { LLMProvider, ProviderConfig, ProviderName } from './types';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';

const DEFAULTS: Record<ProviderName, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
};

export function createProvider(config: ProviderConfig): LLMProvider {
  const model = config.model ?? DEFAULTS[config.provider];
  switch (config.provider) {
    case 'claude': return new ClaudeProvider({ ...config, model });
    case 'openai': return new OpenAIProvider({ ...config, model });
    case 'gemini': return new GeminiProvider({ ...config, model });
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export function createProviderFromEnv(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER ?? 'claude') as ProviderName;
  const keys: Record<ProviderName, string | undefined> = {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  const apiKey = keys[provider];
  if (!apiKey) throw new Error(`Missing API key for provider "${provider}"`);
  return createProvider({ provider, apiKey, model: process.env.LLM_MODEL });
}