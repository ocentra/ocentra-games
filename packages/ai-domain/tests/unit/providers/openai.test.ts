import { describe, it, expect } from 'vitest';
import { OpenAIProvider, createOpenAIProvider } from '@/providers/openai';
import { ProviderType } from '@/types/provider';
import {
  createSubstituteAdapters,
  OPENAI_CHAT_RESPONSE,
} from '../../helpers/substitute-adapters';
import { getSubstituteDefaultApiKey } from '../../helpers/ai-test-credentials';
import { AIError, AIErrorCode } from '@/constants/errors';

describe('OpenAI Provider', () => {
  it('createOpenAIProvider: returns provider instance', () => {
    const { adapters } = createSubstituteAdapters();
    const provider = createOpenAIProvider(ProviderType.OpenAI, adapters);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('generate: calls getSecret with correct providerId', async () => {
    const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
    secrets.prime('openai', 'apiKey', getSubstituteDefaultApiKey());
    fetchSub.prime(new Response(JSON.stringify(OPENAI_CHAT_RESPONSE)));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    await provider.generate({ systemPrompt: 'test', userPrompt: 'hi' });
    const calls = secrets.getCalls();
    expect(calls).toContainEqual(['openai', 'apiKey']);
  });

  it('generate: sends correct URL and headers', async () => {
    const key = getSubstituteDefaultApiKey();
    const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
    secrets.prime('openai', 'apiKey', key);
    fetchSub.prime(new Response(JSON.stringify(OPENAI_CHAT_RESPONSE)));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    await provider.generate({ systemPrompt: 'test', userPrompt: 'hi' });
    const calls = fetchSub.getCalls();
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toContain('/chat/completions');
    expect(calls[0][1]?.method).toBe('POST');
    const headers = (calls[0][1]?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${key}`);
  });

  it('generate: parses response text correctly', async () => {
    const { adapters, fetch: fetchSub } = createSubstituteAdapters();
    fetchSub.prime(new Response(JSON.stringify(OPENAI_CHAT_RESPONSE)));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    const result = await provider.generate({ systemPrompt: 'test', userPrompt: 'hi' });
    expect(result.text).toBe('Hello from substitute!');
    expect(result.metrics?.totalTokens).toBe(15);
  });

  it('generate: throws AuthenticationFailed on 401', async () => {
    const { adapters, fetch: fetchSub } = createSubstituteAdapters();
    fetchSub.prime(new Response('Unauthorized', { status: 401 }));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    try {
      await provider.generate({ systemPrompt: 'test', userPrompt: 'hi' });
      expect.fail('Expected AIError');
    } catch (e) {
      expect(e).toBeInstanceOf(AIError);
      expect((e as AIError).code).toBe(AIErrorCode.AuthenticationFailed);
    }
  });

  it('generate: throws when not initialized', async () => {
    const { adapters } = createSubstituteAdapters();
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    try {
      await provider.generate({ systemPrompt: 'test', userPrompt: 'hi' });
      expect.fail('Expected AIError');
    } catch (e) {
      expect(e).toBeInstanceOf(AIError);
      expect((e as AIError).code).toBe(AIErrorCode.ProviderNotInitialized);
    }
  });

  it('dispose: makes isReady return false', async () => {
    const { adapters, fetch: fetchSub } = createSubstituteAdapters();
    fetchSub.prime(new Response('{}', { status: 200 }));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    expect(provider.isReady()).toBe(true);
    provider.dispose();
    expect(provider.isReady()).toBe(false);
  });

  it('testConnection: returns success when API responds', async () => {
    const { adapters, fetch: fetchSub } = createSubstituteAdapters();
    fetchSub.prime(new Response('{}', { status: 200 }));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });
    const result = await provider.testConnection();
    expect(result.success).toBe(true);
    expect(typeof result.latencyMs).toBe('number');
  });
});
