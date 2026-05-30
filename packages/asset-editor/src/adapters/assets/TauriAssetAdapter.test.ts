import { describe, expect, it } from 'vitest';
import { createBrowserResourceUrl } from '@/adapters/assets/TauriAssetAdapter';

describe('createBrowserResourceUrl', () => {
  it('preserves literal plus signs in resource paths', () => {
    const url = createBrowserResourceUrl(
      'Resources/GameMode/CardGames/Cards/Standard_52_+_Joker(s)/14_of_spades.asset'
    );

    expect(url.pathname).toBe(
      '/Resources/GameMode/CardGames/Cards/Standard_52_+_Joker(s)/14_of_spades.asset'
    );
  });

  it('rejects parent-directory traversal segments', () => {
    expect(() => createBrowserResourceUrl('Resources/GameMode/../secret.asset')).toThrow(
      'Invalid browser asset path'
    );
  });
});
