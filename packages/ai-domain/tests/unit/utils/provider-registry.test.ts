import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProvider,
  listProviders,
  isRegistered,
  registerAllBuiltinProviders,
  getProviderInfo,
} from '@/utils/provider-registry';
import { ProviderType } from '@/types/provider';
import { createSubstituteAdapters } from '../../helpers/substitute-adapters';

describe('provider-registry', () => {
  beforeEach(() => {
    registerAllBuiltinProviders();
  });

  it('registerAllBuiltinProviders: registers all builtin providers', () => {
    const providers = listProviders();
    expect(providers.length).toBeGreaterThan(0);
    const ids = providers.map((p) => p.id);
    expect(ids).toContain(ProviderType.OpenAI);
    expect(ids).toContain(ProviderType.Ollama);
  });

  it('createProvider: returns provider for registered id', () => {
    const { adapters } = createSubstituteAdapters();
    const provider = createProvider(ProviderType.OpenAI, adapters);
    expect(provider).toBeDefined();
    expect(typeof provider.initialize).toBe('function');
    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.dispose).toBe('function');
    expect(typeof provider.isReady).toBe('function');
  });

  it('createProvider: throws for unregistered id', () => {
    const { adapters } = createSubstituteAdapters();
    expect(() => createProvider('unknown-provider' as typeof ProviderType.OpenAI, adapters)).toThrow(
      /Provider not found/
    );
  });

  it('isRegistered: returns true for builtin provider', () => {
    expect(isRegistered(ProviderType.OpenAI)).toBe(true);
  });

  it('getProviderInfo: returns catalog entry for OpenAI', () => {
    const info = getProviderInfo(ProviderType.OpenAI);
    expect(info).toBeDefined();
    expect(info?.name).toBe('OpenAI');
    expect(info?.authType).toBe('api_key');
  });

  it('listProviders: filters by category when provided', () => {
    const cloud = listProviders({ category: 'cloud_api' });
    expect(cloud.length).toBeGreaterThan(0);
    cloud.forEach((p) => expect(p.category).toBe('cloud_api'));
  });
});
