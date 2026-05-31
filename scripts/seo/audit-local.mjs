import { readFile } from 'node:fs/promises';
import { auditSeoSite, formatSeoAuditReport, SeoAuditDiscoverySource, SeoBodyKind } from '../../packages/seo-domain/dist/index.js';
import {
  PublicRouteKey,
  PublicRoutePath,
  PublicRouteSegment,
  buildPublicCategoryPath,
  buildPublicGamePath,
  buildPublicGamePlayPath,
  buildPublicRulesPath,
} from '@ocentra/endpoint-domain/constants/public-routes';
import { LocalWebConfig } from '@ocentra/endpoint-domain/constants/local';

const REPO_ROOT_URL = new URL('../../', import.meta.url);
const CATALOG_SEO_DATA_URL = new URL('src/seo/generated/catalogSeoData.ts', REPO_ROOT_URL);
const CATALOG_REPLACEMENTS_URL = new URL('scripts/seo/catalog-replacements.json', REPO_ROOT_URL);
const DEFAULT_BASE_URL = LocalWebConfig.BaseUrl;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_PAGES = 180;
const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_SITEMAP_URLS = 160;
const DEFAULT_CATALOG_SAMPLE = 20;
const FULL_MAX_PAGES = 2800;
const FULL_MAX_DEPTH = 1;
const FULL_MAX_SITEMAP_URLS = 2600;
const ROOT_PATH = PublicRoutePath[PublicRouteKey.Home];
const INDEXABLE_STATIC_PATHS = new Set([
  PublicRoutePath[PublicRouteKey.Home],
  PublicRoutePath[PublicRouteKey.GamesCatalog],
  PublicRoutePath[PublicRouteKey.Shop],
  PublicRoutePath[PublicRouteKey.Competition],
  PublicRoutePath[PublicRouteKey.Events],
  PublicRoutePath[PublicRouteKey.Tournaments],
  PublicRoutePath[PublicRouteKey.Leaderboard],
]);
const PRIVATE_STATIC_PATHS = new Set([
  PublicRoutePath[PublicRouteKey.Settings],
  PublicRoutePath[PublicRouteKey.Social],
  PublicRoutePath[PublicRouteKey.PlayerHub],
  PublicRoutePath[PublicRouteKey.Lobby],
  PublicRoutePath[PublicRouteKey.Matchmaking],
  PublicRoutePath[PublicRouteKey.Matches],
  PublicRoutePath[PublicRouteKey.Admin],
  PublicRoutePath[PublicRouteKey.AdminTools],
  PublicRoutePath[PublicRouteKey.AdminUsers],
]);
const AUTHORED_RULE_SLUGS = new Set(['claim', 'briscola', 'three-card-brag']);

function readArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

function readNumericArg(name, fallback) {
  const rawValue = readArgValue(name);
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeSlug(value) {
  return String(value ?? '').trim();
}

async function loadReplacedCatalogSlugs() {
  const replacementText = await readFile(CATALOG_REPLACEMENTS_URL, 'utf8');
  const replacementConfig = JSON.parse(replacementText);
  const replacements = Array.isArray(replacementConfig.replacements) ? replacementConfig.replacements : [];
  return new Set(replacements.flatMap(entry => (
    Array.isArray(entry.catalogSlugs)
      ? entry.catalogSlugs.map(normalizeSlug).filter(Boolean)
      : []
  )));
}

function isGamePath(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length >= 2 && parts[0] === PublicRouteSegment.Games && parts[1] !== PublicRouteSegment.CardGames && parts[1] !== PublicRouteSegment.CardGame;
}

function isCategoryPath(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length === 2 && parts[0] === PublicRouteSegment.Categories;
}

function isRulesPath(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length === 2 && parts[0] === PublicRouteSegment.Rules;
}

function isEventDetailPath(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length === 2 && parts[0] === PublicRouteSegment.Events;
}

function isMatchDetailPath(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length === 2 && parts[0] === PublicRouteSegment.Matches;
}

function rulesSlug(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length === 2 && parts[0] === PublicRouteSegment.Rules ? decodeURIComponent(parts[1]) : '';
}

function isPrivateGameSubroute(path) {
  return path.endsWith(`/${PublicRouteSegment.Play}`)
    || path.endsWith(`/${PublicRouteSegment.Lobby}`)
    || path.endsWith(`/${PublicRouteSegment.Matchmaking}`);
}

function createIndexableStaticTarget(path, context) {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'index,follow',
    requireH1: false,
    requireJsonLd: path === ROOT_PATH,
    minTextLength: 0,
  };
}

function createPrivateTarget(path, context) {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'noindex,nofollow',
    requireH1: false,
    requireJsonLd: false,
    minTextLength: 0,
  };
}

function createCatalogTarget(path, context) {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'index,follow',
    expectedSeoBody: SeoBodyKind.Catalog,
    minTextLength: 500,
    minInternalLinks: 4,
  };
}

function createLegacyCatalogTarget(context) {
  return {
    path: PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer],
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: PublicRoutePath[PublicRouteKey.CardGamesCatalog],
    expectedRobots: 'noindex,follow',
    expectedSeoBody: SeoBodyKind.Catalog,
    requireJsonLd: false,
    minTextLength: 500,
    minInternalLinks: 4,
  };
}

function createGameTarget(path, context) {
  const isSample = context.source === SeoAuditDiscoverySource.CatalogSample;
  const minTextLength = isSample ? 900 : 220;
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'index,follow',
    expectedSeoBody: SeoBodyKind.Game,
    minTextLength,
    minInternalLinks: 2,
  };
}

function createRulesTarget(path, context) {
  const isSample = context.source === SeoAuditDiscoverySource.CatalogSample || context.source === SeoAuditDiscoverySource.Sitemap;
  const isAuthored = AUTHORED_RULE_SLUGS.has(rulesSlug(path));
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'index,follow',
    expectedSeoBody: SeoBodyKind.Rules,
    minTextLength: isSample && !isAuthored ? 900 : 220,
    minInternalLinks: 2,
  };
}

function createRetiredLeaderboardAliasTarget(path, context) {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: PublicRoutePath[PublicRouteKey.Leaderboard],
    expectedRobots: 'noindex,follow',
    requireH1: false,
    requireJsonLd: true,
    minTextLength: 0,
  };
}

function createCategoryTarget(path, context) {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'index,follow',
    expectedSeoBody: SeoBodyKind.Category,
    minTextLength: 350,
    minInternalLinks: 2,
  };
}

function createNoindexFollowTarget(path, context) {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    expectedCanonicalPath: path,
    expectedRobots: 'noindex,follow',
    requireH1: false,
    requireJsonLd: false,
    minTextLength: 0,
  };
}

function createTargetForPath(path, context) {
  if (path === PublicRoutePath[PublicRouteKey.CardGamesCatalog] || path === PublicRoutePath[PublicRouteKey.GamesCatalog]) {
    return path === PublicRoutePath[PublicRouteKey.CardGamesCatalog]
      ? createCatalogTarget(path, context)
      : createIndexableStaticTarget(path, context);
  }
  if (path === PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer]) {
    return createLegacyCatalogTarget(context);
  }
  if (path === PublicRoutePath[PublicRouteKey.CardGameTemplate]) {
    return createNoindexFollowTarget(path, context);
  }
  if (path === PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard]) {
    return createRetiredLeaderboardAliasTarget(path, context);
  }
  if (PRIVATE_STATIC_PATHS.has(path)) {
    return createPrivateTarget(path, context);
  }
  if (INDEXABLE_STATIC_PATHS.has(path)) {
    return createIndexableStaticTarget(path, context);
  }
  if (isEventDetailPath(path)) {
    return createIndexableStaticTarget(path, context);
  }
  if (isMatchDetailPath(path)) {
    return createPrivateTarget(path, context);
  }
  if (isCategoryPath(path)) {
    return createCategoryTarget(path, context);
  }
  if (isRulesPath(path)) {
    return createRulesTarget(path, context);
  }
  if (isPrivateGameSubroute(path)) {
    return createPrivateTarget(path, context);
  }
  if (path.endsWith(`/${PublicRouteSegment.Leaderboard}`) && isGamePath(path)) {
    return createRetiredLeaderboardAliasTarget(path, context);
  }
  if (isGamePath(path)) {
    return createGameTarget(path, context);
  }
  if (path.startsWith(`/${PublicRouteSegment.Tournaments}/`)) {
    return createIndexableStaticTarget(path, context);
  }
  return createNoindexFollowTarget(path, context);
}

async function loadCatalogSample(limit) {
  if (limit === 0) {
    return [];
  }
  const catalogText = await readFile(CATALOG_SEO_DATA_URL, 'utf8');
  const replacedSlugs = await loadReplacedCatalogSlugs();
  const gamesMatch = catalogText.match(/export const catalogSeoGames = ([\s\S]*?) satisfies readonly CatalogSeoGameEntry\[\];/);
  const games = gamesMatch ? JSON.parse(gamesMatch[1]) : [];
  const seen = new Set();
  const candidates = [
    'tysiac-1000',
    'ten-card-regrets-poker',
    '11-point-black-tile',
    '3-5-8',
    '3-5-9',
    '32-card-bridge',
  ];
  const bySlug = new Map(games.map(game => [normalizeSlug(game.slug), game]));
  const orderedGames = [
    ...candidates.map(slug => bySlug.get(slug)).filter(Boolean),
    ...games,
  ];
  const sample = [];
  for (const game of orderedGames) {
    const slug = normalizeSlug(game.slug);
    if (!slug || seen.has(slug) || replacedSlugs.has(slug)) {
      continue;
    }
    seen.add(slug);
    if (game.quality !== 'complete') {
      continue;
    }
    sample.push({
      path: buildPublicGamePath(slug),
      label: `Catalog sample: ${game.name ?? slug}`,
      source: SeoAuditDiscoverySource.CatalogSample,
      expectedCanonicalPath: buildPublicGamePath(slug),
      expectedRobots: 'index,follow',
      expectedSeoBody: SeoBodyKind.Game,
      minTextLength: 900,
      minInternalLinks: 2,
    });
    if (sample.length >= limit) {
      return sample;
    }
  }
  return sample;
}

const fullAudit = process.argv.includes('--full');
const baseUrl = readArgValue('--base') || process.env.SEO_AUDIT_BASE_URL || DEFAULT_BASE_URL;
const timeoutMs = readNumericArg('--timeout-ms', Number(process.env.SEO_AUDIT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
const maxPages = readNumericArg('--max-pages', fullAudit ? FULL_MAX_PAGES : DEFAULT_MAX_PAGES);
const maxDepth = readNumericArg('--max-depth', fullAudit ? FULL_MAX_DEPTH : DEFAULT_MAX_DEPTH);
const maxSitemapUrls = readNumericArg('--max-sitemap-urls', fullAudit ? FULL_MAX_SITEMAP_URLS : DEFAULT_MAX_SITEMAP_URLS);
const catalogSampleSize = readNumericArg('--catalog-sample', fullAudit ? 0 : DEFAULT_CATALOG_SAMPLE);

const seedTargets = [
  createIndexableStaticTarget(PublicRoutePath[PublicRouteKey.Home], {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createCatalogTarget(PublicRoutePath[PublicRouteKey.CardGamesCatalog], {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createLegacyCatalogTarget({
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createGameTarget(buildPublicGamePath('tysiac-1000'), {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createRulesTarget(buildPublicRulesPath('tysiac-1000'), {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createGameTarget(buildPublicGamePath('claim'), {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createRulesTarget(buildPublicRulesPath('claim'), {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createCategoryTarget(buildPublicCategoryPath('trick-taking-card-games'), {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createPrivateTarget(PublicRoutePath[PublicRouteKey.Settings], {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
  createPrivateTarget(buildPublicGamePlayPath('claim'), {
    source: SeoAuditDiscoverySource.Seed,
    depth: 0,
  }),
];

const catalogTargets = await loadCatalogSample(catalogSampleSize);
const report = await auditSeoSite({
  baseUrl,
  targets: [...seedTargets, ...catalogTargets],
  timeoutMs,
  discoverSitemap: true,
  crawlInternalLinks: true,
  maxPages,
  maxDepth,
  maxSitemapUrls,
  targetFactory: createTargetForPath,
});

console.log(formatSeoAuditReport(report));
process.exitCode = report.summary.errors > 0 ? 1 : 0;
