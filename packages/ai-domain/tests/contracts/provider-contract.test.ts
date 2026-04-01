import { describe, it, expect } from 'vitest';
import {
  listProviders,
  createProvider,
  registerAllBuiltinProviders,
  isRegistered,
} from '@/utils/provider-registry';
import { createSubstituteAdapters } from '../helpers/substitute-adapters';

registerAllBuiltinProviders();
const allProviders = listProviders().filter((e) => isRegistered(e.id));

describe('Provider Contract', () => {
  for (const entry of allProviders) {
    describe(`${entry.name} (${entry.id})`, () => {
      it('can be instantiated from registry', () => {
        const { adapters } = createSubstituteAdapters();
        const provider = createProvider(entry.id, adapters);
        expect(provider).toBeDefined();
      });

      it('implements isReady', () => {
        const { adapters } = createSubstituteAdapters();
        const provider = createProvider(entry.id, adapters);
        expect(typeof provider.isReady).toBe('function');
        expect(provider.isReady()).toBe(false);
      });

      it('implements dispose', () => {
        const { adapters } = createSubstituteAdapters();
        const provider = createProvider(entry.id, adapters);
        expect(typeof provider.dispose).toBe('function');
        expect(() => provider.dispose()).not.toThrow();
      });

      it('generate: throws when not initialized', async () => {
        const { adapters } = createSubstituteAdapters();
        const provider = createProvider(entry.id, adapters);
        await expect(
          provider.generate({ systemPrompt: 'test', userPrompt: 'test' })
        ).rejects.toThrow();
      });

      it('testConnection: returns ConnectionTestResult shape when initialized', async () => {
        const { adapters, fetch: fetchSub } = createSubstituteAdapters();
        fetchSub.prime(new Response('{}', { status: 200 }));
        const provider = createProvider(entry.id, adapters);
        await provider.initialize({ providerId: entry.id });
        const result = await provider.testConnection();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('latencyMs');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.latencyMs).toBe('number');
      });

      it('dispose: makes isReady return false after init', async () => {
        const { adapters, fetch: fetchSub } = createSubstituteAdapters();
        fetchSub.prime(new Response('{}', { status: 200 }));
        const provider = createProvider(entry.id, adapters);
        await provider.initialize({ providerId: entry.id });
        expect(provider.isReady()).toBe(true);
        provider.dispose();
        expect(provider.isReady()).toBe(false);
      });
    });
  }
});
