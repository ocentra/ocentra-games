import type { UrlAuditRow } from './game-db';

function isValidAuditUrl(url: string): boolean {
  const u = url.trim();
  if (!u || u === 'http' || u === 'https') return false;
  return /^https?:\/\/[^/]+/.test(u);
}

function normalizeUrl(u: string): string {
  return u.trim().replace(/\/+$/, '');
}

export interface UrlAuditEntry {
  url: string;
  listNames: string[];
  listPaths: string[];
  jsonSlugs: string[];
}

export function buildUrlsAuditPayload(rows: UrlAuditRow[]): { urls: UrlAuditEntry[] } {
  const byUrl = new Map<string, { names: string[]; slugs: string[] }>();
  for (const r of rows) {
    if (!isValidAuditUrl(r.source_url)) continue;
    const key = normalizeUrl(r.source_url);
    if (!key) continue;
    if (!byUrl.has(key)) byUrl.set(key, { names: [], slugs: [] });
    const e = byUrl.get(key)!;
    if (!e.slugs.includes(r.slug)) e.slugs.push(r.slug);
    if (r.display_name != null && !e.names.includes(r.display_name)) e.names.push(r.display_name);
  }
  const urls = Array.from(byUrl.entries()).map(([url, v]) => ({
    url,
    listNames: v.names,
    listPaths: [] as string[],
    jsonSlugs: v.slugs,
  }));
  return { urls };
}
