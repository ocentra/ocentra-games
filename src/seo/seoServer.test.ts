import { describe, expect, it } from 'vitest';
import {
  createRobotsTxt,
  createSitemapXml,
  injectSeoIntoHtml,
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
    expect(rendered).toContain('application/ld+json');
    expect(rendered).not.toContain('content="old"');
  });

  it('renders robots and sitemap responses from canonical public routes', () => {
    const robots = createRobotsTxt({ siteOrigin });
    const sitemap = createSitemapXml({ siteOrigin, now: new Date('2026-05-08T00:00:00.000Z') });
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: https://example.ocentra.test/sitemap.xml');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/card-games</loc>');
    expect(sitemap).toContain('<loc>https://example.ocentra.test/games/claim</loc>');
    expect(sitemap).not.toContain('/settings');
    expect(sitemap).not.toContain('/CardGamesExplorer');
  });
});
