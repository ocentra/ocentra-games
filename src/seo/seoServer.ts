import {
  DEFAULT_SEO_SITE_ORIGIN,
  getSitemapEntries,
  resolveSeoMetadata,
  seoCategoryCatalog,
  seoGameCatalog,
  type SitemapEntry,
  type SeoGameEntry,
  type RouteSeoMetadata,
  type SeoStructuredData,
} from './publicSeo';
import { catalogSeoGames, findCatalogSeoGame, type CatalogSeoGameEntry } from './generated/catalogSeoData';
import { PublicRouteKey, buildPublicCategoryPath, buildPublicRulesPath } from '@ocentra/endpoint-domain/constants/public-routes';

export interface SeoRenderOptions {
  siteOrigin?: string;
  now?: Date;
}

const managedSeoScriptPattern = /\s*<script\b(?=[^>]*data-ocentra-seo=["'][^"']+["'])[^>]*>[\s\S]*?<\/script>/gi;
const managedSeoTagPattern = /\s*<(meta|link)\b[^>]+data-ocentra-seo=["'][^"']+["'][^>]*\/?>/gi;
const leakedViteJsonLdProxyPattern = /\s*<script\s+type=["']module["']\s+src=["']\/@id\/__x00__\/[^"']+\?html-proxy&index=\d+\.js["']><\/script>\s*\{["']@context["'][\s\S]*?<\/script>/gi;
const titlePattern = /<title>[\s\S]*?<\/title>/i;
const descriptionPattern = /\s*<meta\s+name=["']description["'][^>]*>/i;
const emptyRootPattern = /<div\s+id=["']root["']><\/div>/i;
const managedSeoRootPattern = /<div\s+id=["']root["']>\s*<main\b(?=[^>]*data-ocentra-seo-body=["'][^"']+["'])[\s\S]*?<\/main>\s*<\/div>/i;
const catalogSitemapGameLimit = Number.MAX_SAFE_INTEGER;
const catalogFallbackGameLinkLimit = Number.MAX_SAFE_INTEGER;
const catalogCategoryGameLinkLimit = Number.MAX_SAFE_INTEGER;
const catalogCategoryStructuredDataGameLimit = 50;
const duplicateCatalogGameNames = new Set(
  [...catalogSeoGames.reduce((counts, game) => {
    counts.set(game.name, (counts.get(game.name) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name),
);
const duplicateCatalogGameDescriptions = new Set(
  [...catalogSeoGames.reduce((counts, game) => {
    counts.set(game.description, (counts.get(game.description) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()]
    .filter(([description, count]) => description && count > 1)
    .map(([description]) => description),
);
const defaultSeoImagePath = '/OcentraLogoCommet.png';
const defaultSeoImageAlt = 'Ocentra Games card game platform artwork';
const seoFallbackMainAttributes = [
  'class="ocentra-seo-fallback"',
  'style="position:fixed;inset-inline-start:-100vw;inset-block-start:0;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;pointer-events:none;user-select:none;opacity:0;"',
];

interface CatalogSeoCategoryEntry {
  slug: string;
  name: string;
  description: string;
  gameCount: number;
}

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

function insertBeforeClosingHead(html: string, value: string): string {
  const closeHeadIndex = html.lastIndexOf('</head>');
  if (closeHeadIndex < 0) {
    return html;
  }
  return `${html.slice(0, closeHeadIndex)}${value}${html.slice(closeHeadIndex)}`;
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

function renderSeoFallbackLinks(
  items: ReadonlyArray<{ href: string; label: string; description?: string }>,
): string {
  return items
    .map(item => [
      '<li>',
      `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`,
      item.description ? `<p>${escapeHtml(item.description)}</p>` : '',
      '</li>',
    ].join(''))
    .join('');
}

function authoredGameSlugs(): Set<string> {
  return new Set(seoGameCatalog.map(game => game.gameId));
}

function catalogIndexableGames(): CatalogSeoGameEntry[] {
  const authored = authoredGameSlugs();
  return catalogSeoGames.filter(game => game.quality === 'complete' && !authored.has(game.slug));
}

function catalogFallbackGameLinks(limit: number): Array<{ href: string; label: string; description?: string }> {
  return catalogIndexableGames()
    .slice(0, limit)
    .map(game => ({
      href: `/games/${encodeURIComponent(game.slug)}`,
      label: game.name,
      description: game.description,
    }));
}

function catalogCategoryGameLinks(categorySlug: string, limit: number): Array<{ href: string; label: string; description?: string }> {
  return catalogIndexableGames()
    .filter(game => categoryPathForGame(game).endsWith(`/${categorySlug}`))
    .slice(0, limit)
    .map(game => ({
      href: `/games/${encodeURIComponent(game.slug)}`,
      label: game.name,
      description: game.description,
    }));
}

function canonicalOrigin(metadata: RouteSeoMetadata): string {
  try {
    return new URL(metadata.canonicalUrl).origin;
  } catch {
    return DEFAULT_SEO_SITE_ORIGIN;
  }
}

function defaultSeoImageUrl(metadata: RouteSeoMetadata): string {
  return `${canonicalOrigin(metadata)}${defaultSeoImagePath}`;
}

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function cleanGameSlugFromCanonical(metadata: RouteSeoMetadata): string | null {
  const match = metadata.canonicalPath.match(/^\/games\/([^/]+)$/);
  return match ? decodeRouteSegment(match[1] ?? '') : null;
}

function cleanRulesSlugFromCanonical(metadata: RouteSeoMetadata): string | null {
  const match = metadata.canonicalPath.match(/^\/rules\/([^/]+)$/);
  return match ? decodeRouteSegment(match[1] ?? '') : null;
}

function cleanCategorySlugFromCanonical(metadata: RouteSeoMetadata): string | null {
  const match = metadata.canonicalPath.match(/^\/categories\/([^/]+)$/);
  return match ? decodeRouteSegment(match[1] ?? '') : null;
}

function authoredGameForMetadata(metadata: RouteSeoMetadata): SeoGameEntry | null {
  const slug = cleanGameSlugFromCanonical(metadata) ?? cleanRulesSlugFromCanonical(metadata);
  if (!slug) {
    return null;
  }
  return seoGameCatalog.find(game => game.gameId === slug || game.legacyGameToken === slug) ?? null;
}

function catalogGameForMetadata(metadata: RouteSeoMetadata): CatalogSeoGameEntry | null {
  const slug = cleanGameSlugFromCanonical(metadata) ?? cleanRulesSlugFromCanonical(metadata);
  if (!slug || authoredGameForMetadata(metadata)) {
    return null;
  }
  return findCatalogSeoGame(slug) ?? null;
}

function slugifyCategory(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card-games';
}

function titleCaseSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function catalogSeoTitleName(game: CatalogSeoGameEntry): string {
  return duplicateCatalogGameNames.has(game.name)
    ? `${game.name} (${titleCaseSlug(game.slug)})`
    : game.name;
}

function catalogSeoDescription(game: CatalogSeoGameEntry): string {
  if (!game.description || !duplicateCatalogGameDescriptions.has(game.description)) {
    return game.description;
  }
  return `${game.description} Catalog entry: ${titleCaseSlug(game.slug)}.`;
}

function catalogSeoRouteTitle(game: CatalogSeoGameEntry, isRulesRoute: boolean): string {
  const titleName = catalogSeoTitleName(game);
  const title = isRulesRoute
    ? `${titleName} Rules | Ocentra Games`
    : `${titleName} Rules, History & Deck | Ocentra Games`;
  if (title.length <= 80) {
    return title;
  }
  const shortened = isRulesRoute
    ? `${titleName} Rules | Ocentra Games`
    : `${titleName} Game Guide | Ocentra Games`;
  return shortened.length <= 80 ? shortened : `${titleName} | Ocentra Games`;
}

function categoryPathForGame(game: CatalogSeoGameEntry): string {
  const categorySlug = slugifyCategory(game.category);
  return `/categories/${categorySlug.endsWith('-card-games') ? categorySlug : `${categorySlug}-card-games`}`;
}

function categorySlugForGame(game: CatalogSeoGameEntry): string {
  return categoryPathForGame(game).split('/').pop() || 'card-games';
}

function categoryNameForSlug(slug: string): string {
  const base = slug.replace(/-card-games$/, '');
  return `${titleCaseSlug(base)} Card Games`;
}

function catalogCategoryDescription(category: CatalogSeoCategoryEntry): string {
  return `Browse ${category.name.toLowerCase()} in the Ocentra catalog, including ${category.gameCount} researched game guide${category.gameCount === 1 ? '' : 's'} with rules, history, deck notes, player counts, and migration status.`;
}

function catalogCategoryEntries(): CatalogSeoCategoryEntry[] {
  const categories = new Map<string, CatalogSeoCategoryEntry>();
  for (const game of catalogIndexableGames()) {
    const slug = categorySlugForGame(game);
    const staticCategory = seoCategoryCatalog.find(category => category.slug === slug);
    const existing = categories.get(slug);
    if (existing) {
      existing.gameCount += 1;
      continue;
    }
    const category = {
      slug,
      name: staticCategory?.name ?? categoryNameForSlug(slug),
      description: staticCategory?.description ?? '',
      gameCount: 1,
    };
    category.description = category.description || catalogCategoryDescription(category);
    categories.set(slug, category);
  }
  return [...categories.values()].sort((a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name));
}

function catalogCategoryForMetadata(metadata: RouteSeoMetadata): CatalogSeoCategoryEntry | null {
  const slug = cleanCategorySlugFromCanonical(metadata);
  return slug ? catalogCategoryEntries().find(category => category.slug === slug) ?? null : null;
}

function renderSeoParagraph(value: string | undefined): string {
  return value ? `<p>${escapeHtml(value)}</p>` : '';
}

function renderSeoFallbackMainOpen(bodyKey: string): string {
  return `<main ${[...seoFallbackMainAttributes, `data-ocentra-seo-body="${bodyKey}"`].join(' ')}>`;
}

function renderGameFallbackSections(sections: ReadonlyArray<{ title: string; value?: string }>): string {
  return sections
    .filter(section => Boolean(section.value))
    .map(section => [
      `<h2>${escapeHtml(section.title)}</h2>`,
      renderSeoParagraph(section.value),
    ].join(''))
    .join('');
}

function renderCatalogGameBodyFallback(metadata: RouteSeoMetadata, game: CatalogSeoGameEntry): string {
  const categoryPath = categoryPathForGame(game);
  const rulesPath = buildPublicRulesPath(game.slug);
  const titleName = catalogSeoTitleName(game);
  return [
    renderSeoFallbackMainOpen('game'),
    '<article>',
    '<p>Catalog game guide</p>',
    `<h1>${escapeHtml(titleName)} Rules, History and Deck</h1>`,
    '<p><strong>Status:</strong> Coming soon. This catalog guide is visible in the SVG explorer while gameplay migration is pending.</p>',
    renderSeoParagraph(game.description || metadata.description),
    renderGameFallbackSections([
      { title: 'Overview', value: game.overview },
      { title: 'History', value: game.history },
      { title: 'Players', value: game.players },
      { title: 'Deck', value: game.deck },
      { title: 'Setup', value: game.setup },
      { title: 'Rules', value: game.rules },
      { title: 'Strategy', value: game.strategy },
      { title: 'Variations', value: game.variations },
    ]),
    '<h2>Related Links</h2>',
    '<ul>',
    `<li><a href="/games/card-games">Browse the full card games catalog</a></li>`,
    `<li><a href="${escapeHtml(rulesPath)}">${escapeHtml(titleName)} rules</a></li>`,
    `<li><a href="${escapeHtml(categoryPath)}">${escapeHtml(game.category)} card games</a></li>`,
    '</ul>',
    '</article>',
    '</main>',
  ].join('');
}

function renderAuthoredGameBodyFallback(metadata: RouteSeoMetadata, game: SeoGameEntry): string {
  const rulesPath = buildPublicRulesPath(game.gameId);
  return [
    renderSeoFallbackMainOpen('game'),
    '<article>',
    '<p>Playable game page</p>',
    `<h1>${escapeHtml(game.name)}</h1>`,
    '<p><strong>Status:</strong> Playable pilot. The React SVG surface loads authored game assets for the full page experience.</p>',
    renderSeoParagraph(game.description || metadata.description),
    '<h2>Play Online</h2>',
    `<p><a href="${escapeHtml(metadata.canonicalPath)}">${escapeHtml(game.name)} game page</a></p>`,
    '<h2>Related Links</h2>',
    '<ul>',
    `<li><a href="/games/card-games">Browse the full card games catalog</a></li>`,
    `<li><a href="${escapeHtml(rulesPath)}">${escapeHtml(game.name)} rules</a></li>`,
    `<li><a href="${escapeHtml(`${metadata.canonicalPath}/leaderboard`)}">${escapeHtml(game.name)} leaderboard</a></li>`,
    '</ul>',
    '</article>',
    '</main>',
  ].join('');
}

function renderCatalogRulesBodyFallback(metadata: RouteSeoMetadata, game: CatalogSeoGameEntry): string {
  const gamePath = `/games/${encodeURIComponent(game.slug)}`;
  const categoryPath = categoryPathForGame(game);
  const titleName = catalogSeoTitleName(game);
  return [
    renderSeoFallbackMainOpen('rules'),
    '<article>',
    '<p>Rules guide</p>',
    `<h1>${escapeHtml(titleName)} Rules</h1>`,
    '<p><strong>Status:</strong> Coming soon. These rules are shown in the SVG explorer while playable migration is pending.</p>',
    renderSeoParagraph(game.description || metadata.description),
    renderGameFallbackSections([
      { title: 'Overview', value: game.overview },
      { title: 'Players', value: game.players },
      { title: 'Deck', value: game.deck },
      { title: 'Setup', value: game.setup },
      { title: 'Gameplay', value: game.rules },
      { title: 'Scoring', value: game.rules },
      { title: 'Variations', value: game.variations },
    ]),
    '<h2>Play Online</h2>',
    `<p><a href="${escapeHtml(gamePath)}">Open the ${escapeHtml(titleName)} catalog game page</a></p>`,
    '<h2>Related Links</h2>',
    '<ul>',
    `<li><a href="/games/card-games">Browse the full card games catalog</a></li>`,
    `<li><a href="${escapeHtml(categoryPath)}">${escapeHtml(game.category)} card games</a></li>`,
    '</ul>',
    '</article>',
    '</main>',
  ].join('');
}

function renderAuthoredRulesBodyFallback(metadata: RouteSeoMetadata, game: SeoGameEntry): string {
  const gamePath = `/games/${encodeURIComponent(game.gameId)}`;
  return [
    renderSeoFallbackMainOpen('rules'),
    '<article>',
    '<p>Rules guide</p>',
    `<h1>${escapeHtml(game.name)} Rules</h1>`,
    '<p><strong>Status:</strong> Playable pilot. The React SVG surface loads authored game assets for the full page experience.</p>',
    renderSeoParagraph(game.description || metadata.description),
    '<h2>Overview</h2>',
    renderSeoParagraph(metadata.description),
    '<h2>Play Online</h2>',
    `<p><a href="${escapeHtml(gamePath)}">Open the ${escapeHtml(game.name)} game page</a></p>`,
    '<h2>Related Links</h2>',
    '<ul>',
    `<li><a href="/games/card-games">Browse the full card games catalog</a></li>`,
    `<li><a href="${escapeHtml(`${gamePath}/leaderboard`)}">${escapeHtml(game.name)} leaderboard</a></li>`,
    '</ul>',
    '</article>',
    '</main>',
  ].join('');
}

function renderStaticIndexableBodyFallback(metadata: RouteSeoMetadata): string {
  const title = metadata.title.replace(' | Ocentra Games', '');
  const playableLinks = seoGameCatalog.map(game => ({
    href: `/games/${game.gameId}`,
    label: game.name,
    description: game.description,
  }));
  const primaryLinks = [
    {
      href: '/games/card-games',
      label: 'Card Games Catalog',
      description: 'Browse researched card game rules, deck notes, history, categories, and playable Ocentra pilots.',
    },
    {
      href: '/categories/trick-taking-card-games',
      label: 'Trick-taking Card Games',
      description: 'Explore trick-taking games with rules, deck systems, player counts, and migration status.',
    },
    {
      href: '/competition',
      label: 'Competition',
      description: 'Track Ocentra competitive formats, tournament paths, leaderboard surfaces, and AI benchmark context.',
    },
    {
      href: '/events',
      label: 'Events',
      description: 'Browse seasonal campaigns that connect shop access, tournament entries, benchmark challenges, and rewards.',
    },
    {
      href: '/tournaments',
      label: 'Tournaments',
      description: 'Follow Ocentra tournament formats, schedules, eligibility, and prize-track pages.',
    },
    {
      href: '/leaderboard',
      label: 'Leaderboard',
      description: 'View Ocentra competitive score tracks across supported games and leaderboard formats.',
    },
    {
      href: '/leaderboard/ai-benchmarks',
      label: 'AI Benchmark Leaderboard',
      description: 'Compare AI-versus-AI benchmark surfaces for Ocentra game simulations.',
    },
  ];

  return [
    renderSeoFallbackMainOpen('public-page'),
    '<section>',
    '<p>Ocentra Games public page</p>',
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(metadata.description)}</p>`,
    '<h2>Primary Ocentra Game Areas</h2>',
    `<ul>${renderSeoFallbackLinks(primaryLinks)}</ul>`,
    '<h2>Playable Card Game Pilots</h2>',
    `<ul>${renderSeoFallbackLinks(playableLinks)}</ul>`,
    '</section>',
    '</main>',
  ].join('');
}

function renderSeoBodyFallback(metadata: RouteSeoMetadata): string {
  if (metadata.routeKey === PublicRouteKey.Game) {
    const catalogGame = catalogGameForMetadata(metadata);
    if (catalogGame) {
      return renderCatalogGameBodyFallback(metadata, catalogGame);
    }
    const authoredGame = authoredGameForMetadata(metadata);
    if (authoredGame) {
      return renderAuthoredGameBodyFallback(metadata, authoredGame);
    }
  }

  if (metadata.routeKey === PublicRouteKey.Rules) {
    const catalogGame = catalogGameForMetadata(metadata);
    if (catalogGame) {
      return renderCatalogRulesBodyFallback(metadata, catalogGame);
    }
    const authoredGame = authoredGameForMetadata(metadata);
    if (authoredGame) {
      return renderAuthoredRulesBodyFallback(metadata, authoredGame);
    }
  }

  if (metadata.routeKey === PublicRouteKey.CardGamesCatalog || metadata.routeKey === PublicRouteKey.LegacyCardGamesExplorer) {
    const categoryLinks = catalogCategoryEntries().map(category => ({
      href: `/categories/${category.slug}`,
      label: category.name,
      description: category.description,
    }));
    const gameLinks = seoGameCatalog.map(game => ({
      href: `/games/${game.gameId}`,
      label: game.name,
      description: game.description,
    }));
    return [
      renderSeoFallbackMainOpen('catalog'),
      '<section>',
      '<p>Catalog index</p>',
      `<h1>${escapeHtml(metadata.title.replace(' | Ocentra Games', ''))}</h1>`,
      `<p>${escapeHtml(metadata.description)}</p>`,
      '<h2>Card Game Categories</h2>',
      `<ul>${renderSeoFallbackLinks(categoryLinks)}</ul>`,
      '<h2>Playable Pilots</h2>',
      `<ul>${renderSeoFallbackLinks(gameLinks)}</ul>`,
      '<h2>Catalog Game Guides</h2>',
      `<ul>${renderSeoFallbackLinks(catalogFallbackGameLinks(catalogFallbackGameLinkLimit))}</ul>`,
      '</section>',
      '</main>',
    ].join('');
  }

  if (metadata.routeKey === PublicRouteKey.Category) {
    const category = catalogCategoryForMetadata(metadata);
    const catalogLinks = category ? catalogCategoryGameLinks(category.slug, catalogCategoryGameLinkLimit) : [];
    return [
      renderSeoFallbackMainOpen('category'),
      '<section>',
      '<p>Catalog category</p>',
      `<h1>${escapeHtml(metadata.title.replace(' | Ocentra Games', ''))}</h1>`,
      `<p>${escapeHtml(metadata.description)}</p>`,
      '<p><a href="/games/card-games">Browse the full card games catalog</a></p>',
      category ? '<h2>Related Playable Pilots</h2>' : '',
      category ? `<ul>${renderSeoFallbackLinks(seoGameCatalog.map(game => ({
        href: `/games/${game.gameId}`,
        label: game.name,
        description: game.description,
      })))}</ul>` : '',
      catalogLinks.length > 0 ? '<h2>Catalog Game Guides</h2>' : '',
      catalogLinks.length > 0 ? `<ul>${renderSeoFallbackLinks(catalogLinks)}</ul>` : '',
      '</section>',
      '</main>',
    ].join('');
  }

  if (
    metadata.routeKey === PublicRouteKey.Home
    || metadata.routeKey === PublicRouteKey.GamesCatalog
    || metadata.routeKey === PublicRouteKey.Shop
    || metadata.routeKey === PublicRouteKey.Competition
    || metadata.routeKey === PublicRouteKey.Events
    || metadata.routeKey === PublicRouteKey.Tournaments
    || metadata.routeKey === PublicRouteKey.Leaderboard
    || metadata.routeKey === PublicRouteKey.AiBenchmarkLeaderboard
  ) {
    return renderStaticIndexableBodyFallback(metadata);
  }

  return '';
}

function structuredCatalogGame(metadata: RouteSeoMetadata, game: CatalogSeoGameEntry): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: catalogSeoTitleName(game),
    description: catalogSeoDescription(game) || metadata.description,
    genre: game.category ? `${game.category} card game` : 'Card game',
    numberOfPlayers: game.players,
    gameItem: game.deck,
    url: metadata.canonicalUrl,
  };
}

function structuredCatalogBreadcrumb(metadata: RouteSeoMetadata, game: CatalogSeoGameEntry): SeoStructuredData {
  const titleName = catalogSeoTitleName(game);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Card Games Catalog',
        item: `${canonicalOrigin(metadata)}/games/card-games`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: titleName,
        item: metadata.canonicalUrl,
      },
    ],
  };
}

function structuredCatalogRules(metadata: RouteSeoMetadata, game: CatalogSeoGameEntry): SeoStructuredData {
  const titleName = catalogSeoTitleName(game);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${titleName} Rules`,
    description: game.rules || catalogSeoDescription(game) || metadata.description,
    url: metadata.canonicalUrl,
    about: {
      '@type': 'Game',
      name: titleName,
      genre: game.category ? `${game.category} card game` : 'Card game',
      numberOfPlayers: game.players,
      gameItem: game.deck,
      url: `${canonicalOrigin(metadata)}/games/${encodeURIComponent(game.slug)}`,
    },
  };
}

function structuredRulesBreadcrumb(metadata: RouteSeoMetadata, gameName: string): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Card Games Catalog',
        item: `${canonicalOrigin(metadata)}/games/card-games`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${gameName} Rules`,
        item: metadata.canonicalUrl,
      },
    ],
  };
}

function structuredCatalogCategory(metadata: RouteSeoMetadata, category: CatalogSeoCategoryEntry): SeoStructuredData {
  const gameLinks = catalogCategoryGameLinks(category.slug, catalogCategoryStructuredDataGameLimit);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description,
    url: metadata.canonicalUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.gameCount,
      itemListElement: gameLinks.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: game.label,
        url: `${canonicalOrigin(metadata)}${game.href}`,
      })),
    },
  };
}

export function resolveServerSeoMetadata(pathname: string, siteOriginInput?: string): RouteSeoMetadata {
  const metadata = resolveSeoMetadata(pathname, siteOriginInput);
  const catalogCategory = metadata.routeKey === 'category' ? catalogCategoryForMetadata(metadata) : null;
  if (catalogCategory) {
    const canonicalPath = buildPublicCategoryPath(catalogCategory.slug);
    const canonicalUrl = `${canonicalOrigin(metadata)}${canonicalPath}`;
    return {
      ...metadata,
      title: `${catalogCategory.name} | Ocentra Games`,
      description: catalogCategory.description,
      canonicalPath,
      canonicalUrl,
      structuredData: [structuredCatalogCategory({ ...metadata, canonicalPath, canonicalUrl }, catalogCategory)],
    };
  }
  const catalogGame = catalogGameForMetadata(metadata);
  if (!catalogGame) {
    return metadata;
  }
  const isRulesRoute = metadata.routeKey === PublicRouteKey.Rules;
  const canonicalPath = isRulesRoute
    ? buildPublicRulesPath(catalogGame.slug)
    : `/games/${encodeURIComponent(catalogGame.slug)}`;
  const canonicalUrl = `${canonicalOrigin(metadata)}${canonicalPath}`;
  const titleName = catalogSeoTitleName(catalogGame);
  const description = isRulesRoute
    ? `Learn ${titleName} rules, player count, deck setup, gameplay, scoring, and variations from the Ocentra card games catalog.`
    : catalogSeoDescription(catalogGame) || `Browse ${titleName} rules, history, deck, players, and coming-soon gameplay status in the Ocentra card games catalog.`;
  return {
    ...metadata,
    title: catalogSeoRouteTitle(catalogGame, isRulesRoute),
    description,
    canonicalPath,
    canonicalUrl,
    structuredData: isRulesRoute
      ? [
        structuredCatalogRules({ ...metadata, canonicalPath, canonicalUrl }, catalogGame),
        structuredRulesBreadcrumb({ ...metadata, canonicalPath, canonicalUrl }, titleName),
      ]
      : [
        structuredCatalogGame({ ...metadata, canonicalPath, canonicalUrl }, catalogGame),
        structuredCatalogBreadcrumb({ ...metadata, canonicalPath, canonicalUrl }, catalogGame),
      ],
  };
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
    `<meta property="og:image" content="${escapeHtml(defaultSeoImageUrl(metadata))}" data-ocentra-seo="og-image" />`,
    `<meta property="og:image:alt" content="${defaultSeoImageAlt}" data-ocentra-seo="og-image-alt" />`,
    `<meta name="twitter:card" content="summary_large_image" data-ocentra-seo="twitter-card" />`,
    `<meta name="twitter:title" content="${escapedTitle}" data-ocentra-seo="twitter-title" />`,
    `<meta name="twitter:description" content="${escapedDescription}" data-ocentra-seo="twitter-description" />`,
    `<meta name="twitter:image" content="${escapeHtml(defaultSeoImageUrl(metadata))}" data-ocentra-seo="twitter-image" />`,
    `<meta name="twitter:image:alt" content="${defaultSeoImageAlt}" data-ocentra-seo="twitter-image-alt" />`,
    jsonLd,
  ].filter(Boolean).join('\n    ');
}

export function getServerSitemapEntries(): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const add = (entry: SitemapEntry) => {
    if (seen.has(entry.path)) {
      return;
    }
    seen.add(entry.path);
    entries.push(entry);
  };
  for (const entry of getSitemapEntries()) {
    add(entry);
  }
  for (const category of catalogCategoryEntries()) {
    add({
      path: buildPublicCategoryPath(category.slug),
      priority: '0.7',
      changefreq: 'weekly',
    });
  }
  for (const game of catalogIndexableGames().slice(0, catalogSitemapGameLimit)) {
    add({
      path: `/games/${encodeURIComponent(game.slug)}`,
      priority: '0.6',
      changefreq: 'weekly',
    });
    add({
      path: buildPublicRulesPath(game.slug),
      priority: '0.6',
      changefreq: 'weekly',
    });
  }
  return entries;
}

export function injectSeoIntoHtml(html: string, metadata: RouteSeoMetadata): string {
  const cleaned = html
    .replace(leakedViteJsonLdProxyPattern, '')
    .replace(managedSeoScriptPattern, '')
    .replace(managedSeoTagPattern, '')
    .replace(descriptionPattern, '')
    .replace(titlePattern, `<title>${escapeHtml(metadata.title)}</title>`);
  const titled = titlePattern.test(cleaned)
    ? cleaned
    : insertBeforeClosingHead(cleaned, `    <title>${escapeHtml(metadata.title)}</title>\n  `);
  const withHead = insertBeforeClosingHead(titled, `    ${renderSeoHead(metadata)}\n  `);
  const bodyFallback = renderSeoBodyFallback(metadata);
  const rootHtml = bodyFallback ? `<div id="root">${bodyFallback}</div>` : '<div id="root"></div>';
  if (managedSeoRootPattern.test(withHead)) {
    return withHead.replace(managedSeoRootPattern, rootHtml);
  }
  return bodyFallback
    ? withHead.replace(emptyRootPattern, rootHtml)
    : withHead;
}

export function createSitemapXml(options: SeoRenderOptions = {}): string {
  const siteOrigin = options.siteOrigin ?? DEFAULT_SEO_SITE_ORIGIN;
  const lastmod = (options.now ?? new Date()).toISOString().slice(0, 10);
  const urls = getServerSitemapEntries()
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
