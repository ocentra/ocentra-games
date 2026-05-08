export const SeoIssueSeverity = {
  Error: 'error',
  Warning: 'warning',
} as const;

export type SeoIssueSeverity = typeof SeoIssueSeverity[keyof typeof SeoIssueSeverity];

export const SeoBodyKind = {
  Catalog: 'catalog',
  Category: 'category',
  Game: 'game',
  Rules: 'rules',
} as const;

export type SeoBodyKind = typeof SeoBodyKind[keyof typeof SeoBodyKind];

export const SeoAuditDiscoverySource = {
  Seed: 'seed',
  Sitemap: 'sitemap',
  Link: 'link',
  CatalogSample: 'catalog-sample',
} as const;

export type SeoAuditDiscoverySource = typeof SeoAuditDiscoverySource[keyof typeof SeoAuditDiscoverySource];

export type ExpectedRobots = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

export interface SeoAuditTarget {
  path: string;
  label?: string;
  source?: SeoAuditDiscoverySource | string;
  discoveredFrom?: string;
  depth?: number;
  expectedCanonicalPath?: string;
  expectedRobots?: ExpectedRobots;
  expectedSeoBody?: SeoBodyKind;
  requireTitle?: boolean;
  requireDescription?: boolean;
  requireCanonical?: boolean;
  requireH1?: boolean;
  requireJsonLd?: boolean;
  minTextLength?: number;
  minInternalLinks?: number;
}

export interface SeoDiscoveredTargetContext {
  source: SeoAuditDiscoverySource;
  fromPath?: string;
  depth: number;
}

export interface SeoAuditOptions {
  baseUrl: string;
  targets: readonly SeoAuditTarget[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  discoverSitemap?: boolean;
  crawlInternalLinks?: boolean;
  maxPages?: number;
  maxDepth?: number;
  maxSitemapUrls?: number;
  targetFactory?: (path: string, context: SeoDiscoveredTargetContext) => SeoAuditTarget | null;
}

export interface SeoIssue {
  severity: SeoIssueSeverity;
  code: string;
  message: string;
}

export interface SeoPageSnapshot {
  url: string;
  status: number;
  title: string;
  description: string;
  robots: string;
  canonicalUrl: string;
  canonicalPath: string;
  h1Texts: string[];
  jsonLdCount: number;
  invalidJsonLdCount: number;
  seoBodyKind: string;
  seoBodyTextLength: number;
  bodyTextLength: number;
  internalLinks: string[];
}

export interface SeoPageAuditResult {
  target: SeoAuditTarget;
  snapshot: SeoPageSnapshot;
  issues: SeoIssue[];
}

export interface SeoAssetAuditResult {
  path: string;
  status: number;
  discoveredLinks?: string[];
  issues: SeoIssue[];
}

export interface SeoAuditSummary {
  pages: number;
  assets: number;
  seedPages: number;
  sitemapPages: number;
  linkPages: number;
  catalogSamplePages: number;
  internalLinks: number;
  uniqueInternalLinks: number;
  errors: number;
  warnings: number;
}

export interface SeoAuditReport {
  baseUrl: string;
  pages: SeoPageAuditResult[];
  assets: SeoAssetAuditResult[];
  summary: SeoAuditSummary;
}
