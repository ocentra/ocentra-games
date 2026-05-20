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

  it('does not preserve removed competition subroutes as legacy game pages', () => {
    const metadata = resolveSeoMetadata('/competition/leaderboard', siteOrigin);
    expect(metadata.routeKey).toBe('unknown');
    expect(metadata.title).toBe('Ocentra Games');
    expect(metadata.canonicalPath).toBe('/competition/leaderboard');
    expect(metadata.robots).toBe('noindex,follow');
  });

  it('resolves event and match route metadata with the right privacy', () => {
    const eventMetadata = resolveSeoMetadata('/events/weekend-cup', siteOrigin);
    const matchesMetadata = resolveSeoMetadata('/matches', siteOrigin);
    const matchMetadata = resolveSeoMetadata('/matches/match-123', siteOrigin);

    expect(eventMetadata.routeKey).toBe('event-detail');
    expect(eventMetadata.canonicalPath).toBe('/events/weekend-cup');
    expect(eventMetadata.robots).toBe('index,follow');
    expect(matchesMetadata.routeKey).toBe('matches');
    expect(matchesMetadata.robots).toBe('noindex,nofollow');
    expect(matchMetadata.routeKey).toBe('match-detail');
    expect(matchMetadata.canonicalPath).toBe('/matches/match-123');
    expect(matchMetadata.robots).toBe('noindex,nofollow');
  });

  it('does not preserve removed or unknown leaderboard subroutes', () => {
    const metadata = resolveSeoMetadata('/leaderboard/random', siteOrigin);
    expect(metadata.routeKey).toBe('unknown');
    expect(metadata.canonicalPath).toBe('/leaderboard/random');
    expect(metadata.robots).toBe('noindex,follow');
  });

  it('does not collapse unknown nested public routes into valid metadata', () => {
    const paths = [
      '/games/card-games/leaderboard',
      '/games/claim/leaderboard/season',
      '/shop/offers',
      '/categories/trick-taking-card-games/extra',
      '/rules/claim/extra',
    ];

    for (const pathname of paths) {
      const metadata = resolveSeoMetadata(pathname, siteOrigin);
      expect(metadata.routeKey, pathname).toBe('unknown');
      expect(metadata.canonicalPath, pathname).toBe(pathname);
      expect(metadata.robots, pathname).toBe('noindex,follow');
    }
  });

  it('canonicalizes replaced catalog game slugs to authored game slugs', () => {
    const gameMetadata = resolveSeoMetadata('/games/brag-3-card', siteOrigin);
    const rulesMetadata = resolveSeoMetadata('/rules/brag-3-card', siteOrigin);
    expect(gameMetadata.title).toBe('Three Card Brag | Ocentra Games');
    expect(gameMetadata.canonicalPath).toBe('/games/three-card-brag');
    expect(rulesMetadata.title).toBe('Three Card Brag Rules | Ocentra Games');
    expect(rulesMetadata.canonicalPath).toBe('/rules/three-card-brag');
  });

  it('marks private and dev routes noindex', () => {
    expect(resolveSeoMetadata('/settings', siteOrigin).robots).toBe('noindex,nofollow');
    expect(resolveSeoMetadata('/games/claim/play', siteOrigin).robots).toBe('noindex,nofollow');
    expect(resolveSeoMetadata('/games/cardgame/template', siteOrigin).robots).toBe('noindex,nofollow');
  });

  it('indexes card game category routes', () => {
    const metadata = resolveSeoMetadata('/categories/trick-taking-card-games', siteOrigin);
    expect(metadata.title).toBe('Trick-taking Card Games | Ocentra Games');
    expect(metadata.canonicalPath).toBe('/categories/trick-taking-card-games');
    expect(metadata.robots).toBe('index,follow');
  });

  it('indexes card game rules routes', () => {
    const metadata = resolveSeoMetadata('/rules/three-card-brag', siteOrigin);
    expect(metadata.title).toBe('Three Card Brag Rules | Ocentra Games');
    expect(metadata.canonicalPath).toBe('/rules/three-card-brag');
    expect(metadata.robots).toBe('index,follow');
  });

  it('keeps private and alias routes out of the sitemap source', () => {
    const paths = getSitemapEntries().map(entry => entry.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/games');
    expect(paths).toContain('/games/card-games');
    expect(paths).toContain('/events');
    expect(paths).toContain('/categories/trick-taking-card-games');
    expect(paths).toContain('/games/claim');
    expect(paths).toContain('/rules/claim');
    expect(paths).toContain('/games/claim/leaderboard');
    expect(paths).not.toContain('/CardGamesExplorer');
    expect(paths).not.toContain('/settings');
    expect(paths).not.toContain('/matches');
    expect(paths).not.toContain('/matches/match-123');
    expect(paths).not.toContain('/games/claim/play');
    expect(paths).not.toContain('/admin');
  });
});
