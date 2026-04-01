import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '@/providers/openai';
import { AnthropicProvider } from '@/providers/anthropic';
import { GeminiProvider } from '@/providers/gemini';
import { CohereProvider } from '@/providers/cohere';
import { ProviderType } from '@/types/provider';
import { createSubstituteAdapters } from '../helpers/substitute-adapters';
import { getSubstituteDefaultApiKey } from '../helpers/ai-test-credentials';
import { AIError } from '@/constants/errors';

const providers = [
  { name: 'OpenAI', Provider: OpenAIProvider, id: ProviderType.OpenAI },
  { name: 'Anthropic', Provider: AnthropicProvider, id: ProviderType.Anthropic },
  { name: 'Gemini', Provider: GeminiProvider, id: ProviderType.Gemini },
  { name: 'Cohere', Provider: CohereProvider, id: ProviderType.Cohere },
] as const;

describe('[G5 Boundary Safety] Error Leakage Prevention', () => {
  describe.each(providers)('$name', ({ Provider, id }) => {
    it('generate: API error with internal IP does not forward IP', async () => {
      const serverError = { error: { message: 'Connection to 10.0.0.5:3000 failed' } };
      const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
      secrets.prime(id as string, 'apiKey', getSubstituteDefaultApiKey());
      fetchSub.prime(new Response(JSON.stringify(serverError), { status: 500 }));
      const provider = new Provider(id, adapters);
      await provider.initialize({ providerId: id });

      try {
        await provider.generate({ systemPrompt: 'test', userPrompt: 'test' });
        expect.fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        const message = (error as Error).message;
        expect(message).not.toContain('10.0.0.5');
      }
    });

    it('generate: API error with 192.168.x.x IP does not forward IP', async () => {
      const serverError = { error: { message: 'Upstream at 192.168.1.100 unavailable' } };
      const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
      secrets.prime(id as string, 'apiKey', getSubstituteDefaultApiKey());
      fetchSub.prime(new Response(JSON.stringify(serverError), { status: 502 }));
      const provider = new Provider(id, adapters);
      await provider.initialize({ providerId: id });

      try {
        await provider.generate({ systemPrompt: 'test', userPrompt: 'test' });
        expect.fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        const message = (error as Error).message;
        expect(message).not.toContain('192.168.1.100');
      }
    });

    it('generate: API error with localhost does not forward', async () => {
      const serverError = { error: { message: 'Cannot reach localhost:8080' } };
      const { adapters, secrets, fetch: fetchSub } = createSubstituteAdapters();
      secrets.prime(id as string, 'apiKey', getSubstituteDefaultApiKey());
      fetchSub.prime(new Response(JSON.stringify(serverError), { status: 500 }));
      const provider = new Provider(id, adapters);
      await provider.initialize({ providerId: id });

      try {
        await provider.generate({ systemPrompt: 'test', userPrompt: 'test' });
        expect.fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        const message = (error as Error).message;
        expect(message).not.toContain('localhost');
      }
    });
  });
});
