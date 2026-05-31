import { describe, expect, it } from 'vitest';
import { createBrowserResourceUrl, isInternalResourceIndexPath } from '@/adapters/assets/TauriAssetAdapter';

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

describe('isInternalResourceIndexPath', () => {
  it('hides metadata and scaffold marker files from the resource index', () => {
    expect(isInternalResourceIndexPath('Resources/GameMode/CardGames/Games/invented/claim/claim.asset.meta')).toBe(true);
    expect(isInternalResourceIndexPath('Resources/GameMode/CardGames/Games/war/.gitkeep')).toBe(true);
    expect(isInternalResourceIndexPath('Resources/.index/assets.db')).toBe(true);
    expect(isInternalResourceIndexPath('Resources/GameMode/CardGames/Games/war/war.asset')).toBe(false);
  });
});
