import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '@/providers/openai';
import { ProviderType } from '@/types/provider';
import {
  createSubstituteAdapters,
  OPENAI_CHAT_RESPONSE,
} from '../helpers/substitute-adapters';

describe('[G5 Boundary Safety] Injection Prevention', () => {
  it('generate: CRLF in user prompt does not inject headers', async () => {
    const { adapters, fetch: fetchSub } = createSubstituteAdapters();
    fetchSub.prime(new Response(JSON.stringify(OPENAI_CHAT_RESPONSE)));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });

    await provider.generate({
      systemPrompt: 'test',
      userPrompt: 'hello\r\nX-Injected-Header: evil',
    });

    const calls = fetchSub.getCalls();
    expect(calls.length).toBeGreaterThan(0);
    const init = calls[0][1] as RequestInit;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['X-Injected-Header']).toBeUndefined();
    expect(Object.keys(headers)).not.toContain('X-Injected-Header');
  });

  it('generate: prompt content is in body not headers', async () => {
    const { adapters, fetch: fetchSub } = createSubstituteAdapters();
    fetchSub.prime(new Response(JSON.stringify(OPENAI_CHAT_RESPONSE)));
    const provider = new OpenAIProvider(ProviderType.OpenAI, adapters);
    await provider.initialize({ providerId: ProviderType.OpenAI });

    await provider.generate({
      systemPrompt: 'sys',
      userPrompt: 'user',
    });

    const calls = fetchSub.getCalls();
    expect(calls.length).toBeGreaterThan(0);
    const init = calls[0][1] as RequestInit;
    const body = init?.body as string;
    const parsed = JSON.parse(body);
    expect(parsed.messages).toBeDefined();
    expect(parsed.messages[0].content).toBe('sys');
    expect(parsed.messages[1].content).toBe('user');
  });
});
