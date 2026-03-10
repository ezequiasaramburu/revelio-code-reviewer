import Bottleneck from 'bottleneck';
import type { LLMProvider, LLMMessage, LLMResponse } from './types';

const DEFAULT_MIN_DELAY_MS = 2_000;
const DEFAULT_MAX_CONCURRENT = 1;

/**
 * Wraps an LLM provider with a rate limiter.
 */
export function createRateLimitedProvider(inner: LLMProvider): LLMProvider {
  const minDelayMs = Number(process.env.REVELIO_LLM_MIN_DELAY_MS) || DEFAULT_MIN_DELAY_MS;
  const maxConcurrent =
    Number(process.env.REVELIO_LLM_MAX_CONCURRENT) || DEFAULT_MAX_CONCURRENT;

  const limiter = new Bottleneck({
    minTime: minDelayMs,
    maxConcurrent,
  });

  return {
    get name(): string {
      return inner.name;
    },
    get model(): string {
      return inner.model;
    },
    complete(messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> {
      return limiter.schedule(() => inner.complete(messages, systemPrompt));
    },
  };
}
