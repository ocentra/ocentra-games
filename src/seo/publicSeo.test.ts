import { describe, expect, it } from 'vitest';
import {
  getSitemapEntries,
  resolveSeoMetadata,
} from './publicSeo';

const siteOrigin = 'https://example.ocentra.test';
const claimToken = 'claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c';

describe('public SEO metadata', () => {
  it('canonicalizes the legacy card catalog route without indexing a duplicate page', () => {
    const metadata = resolveSeoMetadata('/CardGamesExplorer', siteOrigin);
    expect(metadata.canonicalPath).toBe('/games/card-games');
    expect(metadata.robots).toBe('noindex,follow');
  });

  it('canonicalizes legacy selected-game tokens to the game slug', () => {
    const metadata = resolveSeoMetadata(`/games/${claimToken}`, siteOrigin);
    expect(metadata.title).toContain('Claim');
    expect(metadata.canonicalPath).toBe('/games/claim');
    expect(metadata.canonicalUrl).toBe('https://example.ocentra.test/games/claim');
    expect(metadata.robots).toBe('index,follow');
  });

  it('marks private and dev routes noindex', () => {
    expect(resolveSeoMetadata('/settings', siteOrigin).robots).toBe('noindex,nofollow');
    expect(resolveSeoMetadata('/games/claim/play', siteOrigin).robots).toBe('noindex,nofollow');
    expect(resolveSeoMetadata('/games/cardgame/template', siteOrigin).robots).toBe('noindex,nofollow');
  });

  it('keeps private and alias routes out of the sitemap source', () => {
    const paths = getSitemapEntries().map(entry => entry.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/games');
    expect(paths).toContain('/games/card-games');
    expect(paths).toContain('/games/claim');
    expect(paths).toContain('/games/claim/leaderboard');
    expect(paths).not.toContain('/CardGamesExplorer');
    expect(paths).not.toContain('/settings');
    expect(paths).not.toContain('/games/claim/play');
    expect(paths).not.toContain('/admin');
  });
});
