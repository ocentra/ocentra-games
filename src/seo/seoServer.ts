import {
  DEFAULT_SEO_SITE_ORIGIN,
  getSitemapEntries,
  resolveSeoMetadata,
  type RouteSeoMetadata,
  type SeoStructuredData,
} from './publicSeo';

export interface SeoRenderOptions {
  siteOrigin?: string;
  now?: Date;
}

const managedSeoPattern = /\s*<(meta|link|script)[^>]+data-ocentra-seo="[^"]+"[^>]*(?:><\/script>|\/?>)/gi;
const titlePattern = /<title>[\s\S]*?<\/title>/i;
const descriptionPattern = /\s*<meta\s+name=["']description["'][^>]*>/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJsonForHtml(value: SeoStructuredData): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function uniqueStructuredData(items: SeoStructuredData[]): SeoStructuredData[] {
  const seen = new Set<string>();
  const result: SeoStructuredData[] = [];
  for (const item of items) {
    const key = JSON.stringify(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function renderSeoHead(metadata: RouteSeoMetadata): string {
  const escapedTitle = escapeHtml(metadata.title);
  const escapedDescription = escapeHtml(metadata.description);
  const escapedCanonical = escapeHtml(metadata.canonicalUrl);
  const structuredData = uniqueStructuredData(metadata.structuredData);
  const jsonLd = structuredData
    .map(item => `<script type="application/ld+json" data-ocentra-seo="jsonld">${escapeJsonForHtml(item)}</script>`)
    .join('\n    ');
  return [
    `<meta name="description" content="${escapedDescription}" data-ocentra-seo="description" />`,
    `<meta name="robots" content="${metadata.robots}" data-ocentra-seo="robots" />`,
    `<link rel="canonical" href="${escapedCanonical}" data-ocentra-seo="canonical" />`,
    `<meta property="og:type" content="website" data-ocentra-seo="og-type" />`,
    `<meta property="og:title" content="${escapedTitle}" data-ocentra-seo="og-title" />`,
    `<meta property="og:description" content="${escapedDescription}" data-ocentra-seo="og-description" />`,
    `<meta property="og:url" content="${escapedCanonical}" data-ocentra-seo="og-url" />`,
    `<meta property="og:site_name" content="Ocentra Games" data-ocentra-seo="og-site-name" />`,
    `<meta name="twitter:card" content="summary_large_image" data-ocentra-seo="twitter-card" />`,
    `<meta name="twitter:title" content="${escapedTitle}" data-ocentra-seo="twitter-title" />`,
    `<meta name="twitter:description" content="${escapedDescription}" data-ocentra-seo="twitter-description" />`,
    jsonLd,
  ].filter(Boolean).join('\n    ');
}

export function injectSeoIntoHtml(html: string, metadata: RouteSeoMetadata): string {
  const cleaned = html
    .replace(managedSeoPattern, '')
    .replace(descriptionPattern, '')
    .replace(titlePattern, `<title>${escapeHtml(metadata.title)}</title>`);
  const titled = titlePattern.test(cleaned)
    ? cleaned
    : cleaned.replace('</head>', `    <title>${escapeHtml(metadata.title)}</title>\n  </head>`);
  return titled.replace('</head>', `    ${renderSeoHead(metadata)}\n  </head>`);
}

export function createSitemapXml(options: SeoRenderOptions = {}): string {
  const siteOrigin = options.siteOrigin ?? DEFAULT_SEO_SITE_ORIGIN;
  const lastmod = (options.now ?? new Date()).toISOString().slice(0, 10);
  const urls = getSitemapEntries()
    .map(entry => {
      const metadata = resolveSeoMetadata(entry.path, siteOrigin);
      return [
        '  <url>',
        `    <loc>${escapeHtml(metadata.canonicalUrl)}</loc>`,
        `    <lastmod>${escapeHtml(entry.lastmod ?? lastmod)}</lastmod>`,
        `    <changefreq>${escapeHtml(entry.changefreq)}</changefreq>`,
        `    <priority>${escapeHtml(entry.priority)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function createRobotsTxt(options: SeoRenderOptions = {}): string {
  const siteOrigin = options.siteOrigin ?? DEFAULT_SEO_SITE_ORIGIN;
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /settings',
    'Disallow: /social',
    'Disallow: /player-hub',
    'Disallow: /lobby',
    'Disallow: /matchmaking',
    'Disallow: /api/',
    'Disallow: /local/api/',
    'Disallow: /games/cardgame/template',
    `Sitemap: ${siteOrigin.replace(/\/+$/, '')}/sitemap.xml`,
    '',
  ].join('\n');
}

export function isHtmlRouteRequest(pathname: string, acceptHeader?: string): boolean {
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/local/api/') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/assets/')
  ) {
    return false;
  }
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return false;
  }
  return !acceptHeader || acceptHeader.includes('text/html') || acceptHeader.includes('*/*');
}
