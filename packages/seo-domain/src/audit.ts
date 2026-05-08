import { extractSeoPageSnapshot } from './html';
import {
  SeoAuditDiscoverySource,
  SeoIssueSeverity,
  type SeoAssetAuditResult,
  type SeoDiscoveredTargetContext,
  type SeoAuditOptions,
  type SeoAuditReport,
  type SeoAuditTarget,
  type SeoIssue,
  type SeoPageAuditResult,
  type SeoPageSnapshot,
} from './types';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_DEPTH = 1;
const DEFAULT_MAX_SITEMAP_URLS = 50;
const TITLE_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 320;
const DESCRIPTION_MIN_LENGTH = 45;
const LEAKED_VITE_JSON_LD_PROXY_PATTERN = /<script\s+type=["']module["']\s+src=["']\/@id\/__x00__\/[^"']+\?html-proxy&index=\d+\.js["']><\/script>\s*\{["']@context["']/i;
const EXTENSION_PATH_PATTERN = /\.[a-z0-9]{2,8}$/i;
const SKIPPED_CRAWL_PATH_PREFIXES = [
  '/@',
  '/api/',
  '/assets/',
  '/local/api/',
  '/node_modules/',
  '/src/',
];

function makeIssue(severity: SeoIssueSeverity, code: string, message: string): SeoIssue {
  return { severity, code, message };
}

function error(code: string, message: string): SeoIssue {
  return makeIssue(SeoIssueSeverity.Error, code, message);
}

function warning(code: string, message: string): SeoIssue {
  return makeIssue(SeoIssueSeverity.Warning, code, message);
}

function resolveUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function normalizeAuditPath(value: string, baseUrl: string, allowExternalOrigin = false): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('javascript:')) {
    return null;
  }
  try {
    const base = new URL(baseUrl);
    const url = new URL(trimmed, base);
    if (!allowExternalOrigin && url.origin !== base.origin) {
      return null;
    }
    if (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml') {
      return null;
    }
    if (SKIPPED_CRAWL_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) {
      return null;
    }
    if (EXTENSION_PATH_PATTERN.test(url.pathname)) {
      return null;
    }
    const pathname = url.pathname.length > 1 && url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    return pathname || '/';
  } catch {
    return null;
  }
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseSitemapLinks(body: string, baseUrl: string, maxUrls: number): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const locPattern = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null = locPattern.exec(body);
  while (match !== null && links.length < maxUrls) {
    const path = normalizeAuditPath(decodeXmlText(match[1] ?? ''), baseUrl, true);
    if (path && !seen.has(path)) {
      links.push(path);
      seen.add(path);
    }
    match = locPattern.exec(body);
  }
  return links;
}

async function fetchText(fetchImpl: typeof fetch, url: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'text/html,application/xml,text/plain,*/*' },
      signal: controller.signal,
    });
    return {
      status: response.status,
      text: await response.text(),
    };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function shouldRequireJsonLd(target: SeoAuditTarget): boolean {
  if (target.requireJsonLd !== undefined) {
    return target.requireJsonLd;
  }
  return target.expectedRobots === 'index,follow';
}

function shouldRequireH1(target: SeoAuditTarget): boolean {
  if (target.requireH1 !== undefined) {
    return target.requireH1;
  }
  return target.expectedSeoBody !== undefined;
}

function assertTitle(snapshot: SeoPageSnapshot, target: SeoAuditTarget, issues: SeoIssue[]): void {
  if (target.requireTitle === false) {
    return;
  }
  if (!snapshot.title) {
    issues.push(error('missing-title', 'Missing <title>.'));
    return;
  }
  if (snapshot.title.length > TITLE_MAX_LENGTH) {
    issues.push(warning('long-title', `Title is ${snapshot.title.length} characters.`));
  }
}

function assertDescription(snapshot: SeoPageSnapshot, target: SeoAuditTarget, issues: SeoIssue[]): void {
  if (target.requireDescription === false) {
    return;
  }
  if (!snapshot.description) {
    issues.push(error('missing-description', 'Missing meta description.'));
    return;
  }
  if (snapshot.description.length < DESCRIPTION_MIN_LENGTH) {
    issues.push(warning('short-description', `Meta description is ${snapshot.description.length} characters.`));
  }
  if (snapshot.description.length > DESCRIPTION_MAX_LENGTH) {
    issues.push(warning('long-description', `Meta description is ${snapshot.description.length} characters.`));
  }
}

function assertCanonical(snapshot: SeoPageSnapshot, target: SeoAuditTarget, issues: SeoIssue[]): void {
  if (target.requireCanonical === false) {
    return;
  }
  if (!snapshot.canonicalUrl) {
    issues.push(error('missing-canonical', 'Missing canonical link.'));
    return;
  }
  if (target.expectedCanonicalPath && snapshot.canonicalPath !== target.expectedCanonicalPath) {
    issues.push(error('canonical-mismatch', `Canonical path is ${snapshot.canonicalPath || '(empty)'}, expected ${target.expectedCanonicalPath}.`));
  }
}

function assertRobots(snapshot: SeoPageSnapshot, target: SeoAuditTarget, issues: SeoIssue[]): void {
  if (!target.expectedRobots) {
    return;
  }
  if (!snapshot.robots) {
    issues.push(error('missing-robots', 'Missing robots meta tag.'));
    return;
  }
  if (snapshot.robots !== target.expectedRobots) {
    issues.push(error('robots-mismatch', `Robots is ${snapshot.robots}, expected ${target.expectedRobots}.`));
  }
}

function assertHtmlContent(snapshot: SeoPageSnapshot, target: SeoAuditTarget, issues: SeoIssue[]): void {
  if (target.expectedSeoBody && snapshot.seoBodyKind !== target.expectedSeoBody) {
    issues.push(error('seo-body-mismatch', `SEO body is ${snapshot.seoBodyKind || '(missing)'}, expected ${target.expectedSeoBody}.`));
  }
  if (shouldRequireH1(target) && snapshot.h1Texts.length === 0) {
    issues.push(error('missing-h1', 'Missing H1 in raw HTML.'));
  }
  const minTextLength = target.minTextLength ?? 0;
  if (minTextLength > 0) {
    const textLength = target.expectedSeoBody ? snapshot.seoBodyTextLength : snapshot.bodyTextLength;
    if (textLength < minTextLength) {
      issues.push(error('thin-html', `Raw HTML text length is ${textLength}, expected at least ${minTextLength}.`));
    }
  }
  const minInternalLinks = target.minInternalLinks ?? 0;
  if (snapshot.internalLinks.length < minInternalLinks) {
    issues.push(error('few-internal-links', `Found ${snapshot.internalLinks.length} internal links, expected at least ${minInternalLinks}.`));
  }
}

function assertStructuredData(snapshot: SeoPageSnapshot, target: SeoAuditTarget, issues: SeoIssue[]): void {
  if (snapshot.invalidJsonLdCount > 0) {
    issues.push(error('invalid-json-ld', `${snapshot.invalidJsonLdCount} JSON-LD script(s) failed JSON parsing.`));
  }
  if (shouldRequireJsonLd(target) && snapshot.jsonLdCount === 0) {
    issues.push(error('missing-json-ld', 'Missing JSON-LD structured data.'));
  }
}

function assertNoKnownLeaks(rawHtml: string, issues: SeoIssue[]): void {
  if (LEAKED_VITE_JSON_LD_PROXY_PATTERN.test(rawHtml)) {
    issues.push(error('leaked-json-ld-proxy', 'Raw HTML contains a leaked Vite JSON-LD proxy fragment.'));
  }
}

async function auditTarget(fetchImpl: typeof fetch, baseUrl: string, target: SeoAuditTarget, timeoutMs: number): Promise<SeoPageAuditResult> {
  const url = resolveUrl(baseUrl, target.path);
  const issues: SeoIssue[] = [];
  let status = 0;
  let html = '';
  try {
    const response = await fetchText(fetchImpl, url, timeoutMs);
    status = response.status;
    html = response.text;
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    const snapshot = extractSeoPageSnapshot('', url, 0);
    return {
      target,
      snapshot,
      issues: [error('fetch-failed', `Failed to fetch ${url}: ${message}`)],
    };
  }

  const snapshot = extractSeoPageSnapshot(html, url, status);
  if (status < 200 || status >= 300) {
    issues.push(error('bad-status', `HTTP status is ${status}.`));
  }
  assertNoKnownLeaks(html, issues);
  assertTitle(snapshot, target, issues);
  assertDescription(snapshot, target, issues);
  assertCanonical(snapshot, target, issues);
  assertRobots(snapshot, target, issues);
  assertHtmlContent(snapshot, target, issues);
  assertStructuredData(snapshot, target, issues);
  return { target, snapshot, issues };
}

async function auditTextAsset(fetchImpl: typeof fetch, baseUrl: string, path: string, timeoutMs: number, maxSitemapUrls: number): Promise<SeoAssetAuditResult> {
  const issues: SeoIssue[] = [];
  const url = resolveUrl(baseUrl, path);
  let status = 0;
  let body = '';
  try {
    const response = await fetchText(fetchImpl, url, timeoutMs);
    status = response.status;
    body = response.text;
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    return { path, status: 0, issues: [error('fetch-failed', `Failed to fetch ${path}: ${message}`)] };
  }
  if (status < 200 || status >= 300) {
    issues.push(error('bad-status', `${path} returned HTTP ${status}.`));
  }
  if (path === '/robots.txt' && !body.includes('Sitemap:')) {
    issues.push(error('robots-missing-sitemap', 'robots.txt does not declare a sitemap.'));
  }
  if (path === '/sitemap.xml' && (!body.includes('<urlset') || !body.includes('<loc>'))) {
    issues.push(error('invalid-sitemap', 'sitemap.xml does not look like a sitemap URL set.'));
  }
  return {
    path,
    status,
    discoveredLinks: path === '/sitemap.xml' && status >= 200 && status < 300
      ? parseSitemapLinks(body, baseUrl, maxSitemapUrls)
      : undefined,
    issues,
  };
}

function addDuplicateIssues(pages: SeoPageAuditResult[], field: 'title' | 'description' | 'canonicalUrl', code: string, label: string): void {
  const buckets = new Map<string, SeoPageAuditResult[]>();
  for (const page of pages) {
    if (page.snapshot.robots !== 'index,follow') {
      continue;
    }
    const value = page.snapshot[field];
    if (!value) {
      continue;
    }
    const current = buckets.get(value) ?? [];
    current.push(page);
    buckets.set(value, current);
  }
  for (const [, duplicates] of buckets) {
    if (duplicates.length < 2) {
      continue;
    }
    const paths = duplicates.map(page => page.target.path).join(', ');
    for (const page of duplicates) {
      page.issues.push(error(code, `Duplicate ${label} shared by ${paths}.`));
    }
  }
}

function summarize(pages: SeoPageAuditResult[], assets: SeoAssetAuditResult[]): SeoAuditReport['summary'] {
  const issues = [
    ...pages.flatMap(page => page.issues),
    ...assets.flatMap(asset => asset.issues),
  ];
  const internalLinks = pages.flatMap(page => page.snapshot.internalLinks);
  return {
    pages: pages.length,
    assets: assets.length,
    seedPages: pages.filter(page => page.target.source === SeoAuditDiscoverySource.Seed || page.target.source === undefined).length,
    sitemapPages: pages.filter(page => page.target.source === SeoAuditDiscoverySource.Sitemap).length,
    linkPages: pages.filter(page => page.target.source === SeoAuditDiscoverySource.Link).length,
    catalogSamplePages: pages.filter(page => page.target.source === SeoAuditDiscoverySource.CatalogSample).length,
    internalLinks: internalLinks.length,
    uniqueInternalLinks: new Set(internalLinks).size,
    errors: issues.filter(issue => issue.severity === SeoIssueSeverity.Error).length,
    warnings: issues.filter(issue => issue.severity === SeoIssueSeverity.Warning).length,
  };
}

function defaultTargetFactory(path: string, context: SeoDiscoveredTargetContext): SeoAuditTarget {
  return {
    path,
    source: context.source,
    discoveredFrom: context.fromPath,
    depth: context.depth,
    requireH1: false,
    requireJsonLd: false,
  };
}

function createTargetQueue(options: SeoAuditOptions): {
  addTarget: (target: SeoAuditTarget, context: SeoDiscoveredTargetContext) => boolean;
  pages: SeoPageAuditResult[];
  queue: SeoAuditTarget[];
  seen: Set<string>;
} {
  const queue: SeoAuditTarget[] = [];
  const seen = new Set<string>();
  const pages: SeoPageAuditResult[] = [];
  const factory = options.targetFactory ?? defaultTargetFactory;

  function addTarget(target: SeoAuditTarget, context: SeoDiscoveredTargetContext): boolean {
    const normalizedPath = normalizeAuditPath(target.path, options.baseUrl);
    if (!normalizedPath || seen.has(normalizedPath)) {
      return false;
    }
    const enrichedTarget = target.path === normalizedPath
      ? target
      : { ...target, path: normalizedPath };
    const policyTarget = factory(enrichedTarget.path, context);
    if (!policyTarget) {
      return false;
    }
    seen.add(enrichedTarget.path);
    queue.push({
      ...policyTarget,
      ...enrichedTarget,
      source: enrichedTarget.source ?? policyTarget.source ?? context.source,
      discoveredFrom: enrichedTarget.discoveredFrom ?? policyTarget.discoveredFrom ?? context.fromPath,
      depth: enrichedTarget.depth ?? policyTarget.depth ?? context.depth,
    });
    return true;
  }

  return { addTarget, pages, queue, seen };
}

export async function auditSeoSite(options: SeoAuditOptions): Promise<SeoAuditReport> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxSitemapUrls = options.maxSitemapUrls ?? DEFAULT_MAX_SITEMAP_URLS;
  const maxPages = options.maxPages ?? options.targets.length;
  const assets = await Promise.all([
    auditTextAsset(fetchImpl, options.baseUrl, '/robots.txt', timeoutMs, maxSitemapUrls),
    auditTextAsset(fetchImpl, options.baseUrl, '/sitemap.xml', timeoutMs, maxSitemapUrls),
  ]);
  const targetQueue = createTargetQueue(options);
  for (const target of options.targets) {
    targetQueue.addTarget(target, {
      source: SeoAuditDiscoverySource.Seed,
      depth: target.depth ?? 0,
    });
  }
  if (options.discoverSitemap !== false) {
    const sitemap = assets.find(asset => asset.path === '/sitemap.xml');
    for (const path of sitemap?.discoveredLinks ?? []) {
      targetQueue.addTarget({ path }, {
        source: SeoAuditDiscoverySource.Sitemap,
        fromPath: '/sitemap.xml',
        depth: 0,
      });
    }
  }

  while (targetQueue.queue.length > 0 && targetQueue.pages.length < maxPages) {
    const target = targetQueue.queue.shift();
    if (!target) {
      continue;
    }
    const page = await auditTarget(fetchImpl, options.baseUrl, target, timeoutMs);
    targetQueue.pages.push(page);
    const depth = target.depth ?? 0;
    if (!options.crawlInternalLinks || depth >= maxDepth || targetQueue.pages.length >= maxPages) {
      continue;
    }
    for (const link of page.snapshot.internalLinks) {
      if (targetQueue.pages.length + targetQueue.queue.length >= maxPages) {
        break;
      }
      targetQueue.addTarget({ path: link }, {
        source: SeoAuditDiscoverySource.Link,
        fromPath: target.path,
        depth: depth + 1,
      });
    }
  }

  const pages = targetQueue.pages;
  addDuplicateIssues(pages, 'title', 'duplicate-title', 'title');
  addDuplicateIssues(pages, 'description', 'duplicate-description', 'meta description');
  addDuplicateIssues(pages, 'canonicalUrl', 'duplicate-canonical', 'canonical URL');
  return {
    baseUrl: options.baseUrl,
    pages,
    assets,
    summary: summarize(pages, assets),
  };
}
