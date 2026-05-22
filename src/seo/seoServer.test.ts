import { describe, expect, it } from 'vitest';
import {
  createRobotsTxt,
  createSitemapXml,
  injectSeoIntoHtml,
  resolveServerSeoMetadata,
} from './seoServer';
import { resolveSeoMetadata } from './publicSeo';

const html = '<html><head><meta name="description" content="old" /><title>Old</title></head><body><div id="root"></div></body></html>';
const siteOrigin = 'https://example.ocentra.test';

describe('SEO server rendering', () => {
  it('injects route-specific title, canonical, robots, and structured data', () => {
    const rendered = injectSeoIntoHtml(html, resolveSeoMetadata('/leaderboard/ai-benchmarks', siteOrigin));
    expect(rendered).toContain('<title>AI Benchmark Leaderboard | Ocentra Games</title>');
    expect(rendered).toContain('name="robots" content="index,follow"');
    expect(rendered).toContain('rel="canonical" href="https://example.ocentra.test/leaderboard/ai-benchmarks"');
    expect(rendered).toContain('property="og:image" content="https://example.ocentra.test/OcentraLogoCommet.png"');
    expect(rendered).toContain('name="twitter:image" content="https://example.ocentra.test/OcentraLogoCommet.png"');
    expect(rendered).toContain('application/ld+json');
    expect(rendered).not.toContain('content="old"');
  });

  it('renders catalog body fallback content before React mounts', () => {
    const rendered = injectSeoIntoHtml(html, resolveSeoMetadata('/games/card-games', siteOrigin));
    expect(rendered).toContain('data-ocentra-seo-body="catalog"');
    expect(rendered).toContain('<h1>Card Games Catalog</h1>');
    expect(rendered).toContain('<a href="/categories/trick-taking-card-games">Trick-taking Card Games</a>');
    expect(rendered).toContain('<h2>Catalog Game Guides</h2>');
    expect(rendered).toContain('<a href="/games/11-point-black-tile">11 Point Black Tile</a>');
  });

  it('renders static public page fallback content before React mounts', () => {
    const rendered = injectSeoIntoHtml(html, resolveSeoMetadata('/', siteOrigin));
    expect(rendered).toContain('data-ocentra-seo-body="public-page"');
    expect(rendered).toContain('class="ocentra-seo-fallback"');
    expect(rendered).toContain('style="position:fixed;inset-inline-start:-100vw;');
    expect(rendered).toContain('<h1>Ocentra Games | AI Card Games And Verifiable Play</h1>');
    expect(rendered).toContain('<a href="/games/card-games">Card Games Catalog</a>');
    expect(rendered).toContain('<a href="/games/claim">Claim</a>');
  });

  it('replaces a previously injected static fallback when reinjecting a route', () => {
    const homeHtml = injectSeoIntoHtml(html, resolveSeoMetadata('/', siteOrigin));
    const rendered = injectSeoIntoHtml(homeHtml, resolveSeoMetadata('/games/claim', siteOrigin));
    expect(rendered).toContain('data-ocentra-seo-body="game"');
    expect(rendered).toContain('<h1>Claim</h1>');
    expect(rendered).not.toContain('data-ocentra-seo-body="public-page"');
  });

  it('renders category body fallback content before React mounts', () => {
    const rendered = injectSeoIntoHtml(html, resolveSeoMetadata('/categories/trick-taking-card-games', siteOrigin));
    expect(rendered).toContain('data-ocentra-seo-body="category"');
    expect(rendered).toContain('<h1>Trick-taking Card Games</h1>');
    expect(rendered).toContain('<a href="/games/card-games">Browse the full card games catalog</a>');
  });

  it('renders catalog game body fallback content before React mounts', () => {
    const metadata = resolveServerSeoMetadata('/games/tysiac-1000', siteOrigin);
    const rendered = injectSeoIntoHtml(html, metadata);
    expect(metadata.title).toBe('1000 (Tysiąc) Rules, History & Deck | Ocentra Games');
    expect(rendered).toContain('data-ocentra-seo-body="game"');
    expect(rendered).toContain('<h1>1000 (Tysiąc) Rules, History and Deck</h1>');
    expect(rendered).toContain('<strong>Status:</strong> Coming soon');
    expect(rendered).toContain('<h2>Rules</h2>');
    expect(rendered).toContain('<a href="/categories/trick-taking-card-games">Trick-taking card games</a>');
  });

  it('uses authored fallback content for replaced catalog game slugs', () => {
    const metadata = resolveServerSeoMetadata('/games/brag-3-card', siteOrigin);
    const rendered = injectSeoIntoHtml(html, metadata);
    expect(metadata.title).toBe('Three Card Brag | Ocentra Games');
    expect(metadata.canonicalPath).toBe('/games/three-card-brag');
    expect(rendered).toContain('<p>Playable game page</p>');
    expect(rendered).toContain('<h1>Three Card Brag</h1>');
    expect(rendered).not.toContain('Catalog game guide');
  });

  it('renders catalog rules body fallback content before React mounts', () => {
    const metadata = resolveServerSeoMetadata('/rules/11-point-black-tile', siteOrigin);
    const rendered = injectSeoIntoHtml(html, metadata);
    expect(metadata.title).toBe('11 Point Black Tile Rules | Ocentra Games');
    expect(metadata.canonicalPath).toBe('/rules/11-point-black-tile');
    expect(rendered).toContain('data-ocentra-seo-body="rules"');
    expect(rendered).toContain('<h1>11 Point Black Tile Rules</h1>');
    expect(rendered).toContain('<h2>Gameplay</h2>');
    expect(rendered).toContain('<a href="/games/11-point-black-tile">Open the 11 Point Black Tile catalog game page</a>');
  });

  it('renders authored rules body fallback content before React mounts', () => {
    const rendered = injectSeoIntoHtml(html, resolveServerSeoMetadata('/rules/claim', siteOrigin));
    expect(rendered).toContain('data-ocentra-seo-body="rules"');
    expect(rendered).toContain('<h1>Claim Rules</h1>');
    expect(rendered).toContain('<a href="/games/claim">Open the Claim game page</a>');
  });

  it('removes leaked Vite JSON-LD proxy fragments before reinjecting route metadata', () => {
    const brokenHtml = [
      '<html><head><title>Old</title>',
      '<script type="module" src="/@id/__x00__/CardGamesExplorer?html-proxy&index=0.js"></script>{"@context":"https://schema.org","@type":"WebSite"}</script>',
      '</head><body><div id="root"></div></body></html>',
    ].join('');
    const rendered = injectSeoIntoHtml(brokenHtml, resolveSeoMetadata('/games/card-games', siteOrigin));
    expect(rendered).not.toContain('html-proxy&index=0.js"></script>{"@context"');
    expect(rendered).toContain('<script type="application/ld+json" data-ocentra-seo="jsonld">');
    expect(rendered).toContain('"@type":"CollectionPage"');
  });

  it('renders robots and sitemap responses from canonical public routes', () => {
    const robots = createRobotsTxt({ siteOrigin });
    const sitemap = createSitemapXml({ siteOrigin, now: new Date('2026-05-08T00:00:00.000Z') });
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: https://example.ocentra.test/sitemap.xml');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/card-games</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/claim</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/rules/claim</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/11-point-black-tile</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/rules/11-point-black-tile</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/categories/tile-card-games</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/zwicker</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/rules/zwicker</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/three-card-brag</loc>');
    expect(sitemap).not.toContain('/games/brag-3-card');
    expect(sitemap).not.toContain('/rules/brag-3-card');
    expect(sitemap).not.toContain('/settings');
    expect(sitemap).not.toContain('/CardGamesExplorer');
    expect((sitemap.match(/<loc>/g) ?? []).length).toBeGreaterThan(2000);
  });
});
