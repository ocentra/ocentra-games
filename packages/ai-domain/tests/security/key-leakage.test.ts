import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '@/providers/openai';
import { AnthropicProvider } from '@/providers/anthropic';
import { GeminiProvider } from '@/providers/gemini';
import { CohereProvider } from '@/providers/cohere';
import { OllamaProvider } from '@/providers/ollama';
import { ProviderType } from '@/types/provider';
import { createSubstituteAdapters } from '../helpers/substitute-adapters';
import { getLeakageFakeKey } from '../helpers/ai-test-credentials';

const realisticKey = getLeakageFakeKey();

const providers = [
  { name: 'OpenAI', Provider: OpenAIProvider, id: ProviderType.OpenAI },
  { name: 'Anthropic', Provider: AnthropicProvider, id: ProviderType.Anthropic },
  { name: 'Gemini', Provider: GeminiProvider, id: ProviderType.Gemini },
  { name: 'Cohere', Provider: CohereProvider, id: ProviderType.Cohere },
] as const;

describe('[G5 Boundary Safety] Key Leakage Prevention', () => {
  describe.each(providers)('$name', ({ Provider, id }) => {
    it('generate: API key not in error message on 401', async () => {
      const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
      secrets.prime(id as string, 'apiKey', realisticKey);
      fetchSub.prime(new Response('Unauthorized', { status: 401 }));
      const provider = new Provider(id, adapters);
      await provider.initialize({ providerId: id });

      try {
        await provider.generate({ systemPrompt: 'test', userPrompt: 'test' });
        expect.fail('Expected error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(realisticKey);
        expect(JSON.stringify(error)).not.toContain(realisticKey);
      }
    });

    it('generate: API key not in error on network error', async () => {
      const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
      secrets.prime(id as string, 'apiKey', realisticKey);
      fetchSub.primeReject(new Error('Network failed'));
      const provider = new Provider(id, adapters);
      await provider.initialize({ providerId: id });

      try {
        await provider.generate({ systemPrompt: 'test', userPrompt: 'test' });
        expect.fail('Expected error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(realisticKey);
        expect(JSON.stringify(error)).not.toContain(realisticKey);
      }
    });

    it('testConnection: API key not in failure result', async () => {
      const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
      secrets.prime(id as string, 'apiKey', realisticKey);
      fetchSub.prime(new Response('Unauthorized', { status: 401 }));
      const provider = new Provider(id, adapters);
      await provider.initialize({ providerId: id });
      const result = await provider.testConnection();
      if (result.error) {
        expect(result.error).not.toContain(realisticKey);
      }
    });
  });

  describe('Ollama (no key)', () => {
    it('generate: no key leak in error on network error', async () => {
      const { adapters, fetch: fetchSub } = createSubstituteAdapters();
      fetchSub.primeReject(new Error('Network failed'));
      const provider = new OllamaProvider(ProviderType.Ollama, adapters);
      await provider.initialize({ providerId: ProviderType.Ollama });

      try {
        await provider.generate({ systemPrompt: 'test', userPrompt: 'test' });
        expect.fail('Expected error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(realisticKey);
      }
    });
  });
});
