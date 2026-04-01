import { describe, it, expect } from 'vitest';
import {
  validateProviderConfig,
  apiKeyProviderConfigSchema,
  localServerConfigSchema,
} from '@/validators/config-validators';
import { ProviderType } from '@/types/provider';

describe('config-validators', () => {
  it('validateProviderConfig: returns ApiKeyProviderConfig for valid api key config', () => {
    const config = {
      providerId: ProviderType.OpenAI,
      enabled: true,
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      temperature: 0.7,
    };
    const result = validateProviderConfig(config);
    expect(result.providerId).toBe(ProviderType.OpenAI);
    expect(result.enabled).toBe(true);
    expect(result.name).toBe('OpenAI');
    expect((result as { baseUrl?: string }).baseUrl).toBe('https://api.openai.com/v1');
  });

  it('validateProviderConfig: returns LocalServerConfig for valid local config', () => {
    const config = {
      providerId: ProviderType.Ollama,
      enabled: true,
      name: 'Ollama',
      baseUrl: 'http://localhost:11434',
    };
    const result = validateProviderConfig(config);
    expect(result.providerId).toBe(ProviderType.Ollama);
    expect((result as { baseUrl?: string }).baseUrl).toBe('http://localhost:11434');
  });

  it('validateProviderConfig: throws for invalid baseUrl', () => {
    const config = {
      providerId: ProviderType.OpenAI,
      enabled: true,
      name: 'OpenAI',
      baseUrl: 'not-a-url',
    };
    expect(() => validateProviderConfig(config)).toThrow('Invalid provider config');
  });

  it('apiKeyProviderConfigSchema: accepts valid temperature 0-2', () => {
    const result = apiKeyProviderConfigSchema.safeParse({
      providerId: 'openai',
      enabled: true,
      name: 'OpenAI',
      temperature: 1.5,
    });
    expect(result.success).toBe(true);
  });

  it('apiKeyProviderConfigSchema: rejects temperature > 2', () => {
    const result = apiKeyProviderConfigSchema.safeParse({
      providerId: 'openai',
      enabled: true,
      name: 'OpenAI',
      temperature: 3,
    });
    expect(result.success).toBe(false);
  });

  it('localServerConfigSchema: requires baseUrl', () => {
    const result = localServerConfigSchema.safeParse({
      providerId: ProviderType.Ollama,
      enabled: true,
      name: 'Ollama',
    });
    expect(result.success).toBe(false);
  });
});
