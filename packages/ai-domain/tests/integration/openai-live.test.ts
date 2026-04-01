import { describe, it, expect, beforeEach } from 'vitest';
import { createProvider } from '@/utils/provider-registry';
import { registerAllBuiltinProviders } from '@/utils/provider-registry';
import { ProviderType } from '@/types/provider';
import type { AIAdapters } from '@/types/adapters';

describe.skipIf(!process.env.OPENAI_API_KEY)('OpenAI Live Integration', () => {
  const adapters: AIAdapters = {
    secrets: {
      getSecret: async (_id, key) =>
        key === 'apiKey' ? process.env.OPENAI_API_KEY ?? null : null,
    },
    fetch: { fetch: globalThis.fetch.bind(globalThis) },
  };

  beforeEach(() => {
    registerAllBuiltinProviders();
  });

  it('generate: returns response from real API', async () => {
    const provider = createProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI, model: 'gpt-4o-mini' });
    const result = await provider.generate({
      systemPrompt: 'You are a helpful assistant. Reply in one word.',
      userPrompt: 'Say hello.',
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.metrics?.latencyMs).toBeGreaterThan(0);
  });

  it('testConnection: returns success', async () => {
    const provider = createProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    const result = await provider.testConnection();
    expect(result.success).toBe(true);
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('listModels: returns available models', async () => {
    const provider = createProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    const models = await provider.listModels?.();
    expect(models).toBeDefined();
    expect(models!.length).toBeGreaterThan(0);
    expect(models![0]).toHaveProperty('id');
  });
});
