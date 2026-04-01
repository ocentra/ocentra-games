import { describe, it, expect } from 'vitest';
import { ProviderCatalog } from '@/constants/provider-catalog';
import { ProviderType } from '@/types/provider';
import { isRegistered, registerAllBuiltinProviders } from '@/utils/provider-registry';

registerAllBuiltinProviders();

describe('provider-catalog-audit', () => {
  it('every enabled catalog entry either is registered or is LocalTransformers', () => {
    const entries = Object.values(ProviderCatalog);
    const enabled = entries.filter((e) => e.enabled !== false);
    for (const entry of enabled) {
      const registered = isRegistered(entry.id);
      const isLocalTransformers = entry.id === ProviderType.LocalTransformers;
      expect(
        registered || isLocalTransformers,
        `Enabled catalog entry ${entry.id} must be in registry or LocalTransformers (wired via BrowserLocalProvider)`
      ).toBe(true);
    }
  });

  it('disabled catalog entries are documented', () => {
    const entries = Object.values(ProviderCatalog);
    const disabled = entries.filter((e) => e.enabled === false);
    for (const entry of disabled) {
      expect(
        entry.description.toLowerCase().includes('coming soon') ||
          entry.description.toLowerCase().includes('disabled'),
        `Disabled entry ${entry.id} should have "coming soon" or similar in description`
      ).toBe(true);
    }
  });
});
