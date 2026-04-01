import { useState, useEffect, useMemo, useCallback } from 'react';
import type { UrlAuditEntry, UrlStatus, UrlAuditFilter } from '../types';
import { EXPORT_FILTER_TO_FILENAME } from '../types';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';

const CONCURRENCY = 20;

export function useUrlAudit(active: boolean) {
  const [urls, setUrls] = useState<UrlAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, UrlStatus>>({});
  const [filter, setFilter] = useState<UrlAuditFilter>('all');
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError(null);
    fetch(LocalApiEndpoint.CardGames.UrlsAudit)
      .then(async r => {
        if (!r.ok) {
          const body = await r.text();
          throw new Error(body ? `${r.status}: ${body.slice(0, 150)}` : `URL audit failed (${r.status})`);
        }
        return r.json() as Promise<{ urls: UrlAuditEntry[] }>;
      })
      .then(data => setUrls(data.urls ?? []))
      .catch(e => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  }, [active]);

  const url404List = useMemo(() => urls.filter(u => statusMap[u.url]?.status === 404), [urls, statusMap]);
  const urlFailedList = useMemo(() => urls.filter(u => statusMap[u.url] && !statusMap[u.url].ok), [urls, statusMap]);

  const filtered = useMemo(() => urls.filter(u => {
    if (filter === 'wrong')        return statusMap[u.url] && !statusMap[u.url].ok;
    if (filter === '404')          return statusMap[u.url]?.status === 404;
    if (filter === 'no_list_name') return u.listNames.length === 0;
    if (filter === 'no_json')      return u.jsonSlugs.length === 0;
    return true;
  }), [urls, filter, statusMap]);

  const validate = useCallback(async () => {
    const toCheck = urls.filter(u => {
      const uu = u.url.trim();
      return uu.length > 10 && uu !== 'http' && uu !== 'https' && /^https?:\/\/[^/]+/.test(uu);
    });
    if (toCheck.length === 0) return;
    setValidating(true);
    setProgress({ done: 0, total: toCheck.length });

    for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
      const batch = toCheck.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async ({ url }) => {
          const r = await fetch(`${LocalApiEndpoint.CardGames.CheckUrl}?url=${encodeURIComponent(url)}`);
          const data = await r.json() as { status?: number; ok?: boolean; error?: string };
          return { url, status: data.status ?? 0, ok: data.ok ?? false, log: data.error ?? (!data.ok && data.status ? `HTTP ${data.status}` : undefined) };
        })
      );
      const batchMap: Record<string, UrlStatus> = {};
      results.forEach((p, idx) => {
        const url = batch[idx].url;
        if (p.status === 'fulfilled') batchMap[url] = p.value;
        else batchMap[url] = { status: 0, ok: false, log: String((p as PromiseRejectedResult).reason?.message ?? 'Request failed') };
      });
      setStatusMap(prev => ({ ...prev, ...batchMap }));
      setProgress({ done: Math.min(i + batch.length, toCheck.length), total: toCheck.length });
    }
    setValidating(false);
  }, [urls]);

  const exportFiltered = useCallback(async () => {
    const ndjson = filtered.map(u => {
      const s = statusMap[u.url];
      return JSON.stringify({ url: u.url, status: s?.status ?? null, ok: s?.ok ?? false, log: s?.log ?? null, inList: u.listNames, inJson: u.jsonSlugs });
    }).join('\n');
    const suffix = EXPORT_FILTER_TO_FILENAME[filter];
    await fetch(`${LocalApiEndpoint.CardGames.ExportUrlAudit}?filter=${encodeURIComponent(suffix)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-ndjson' }, body: ndjson,
    });
  }, [filtered, statusMap, filter]);

  const exportList = useCallback(async (list: UrlAuditEntry[], logKey: string) => {
    const ndjson = list.map(u => {
      const s = statusMap[u.url];
      return JSON.stringify({ url: u.url, status: s?.status ?? null, ok: s?.ok ?? false, log: s?.log ?? null, inList: u.listNames, inJson: u.jsonSlugs });
    }).join('\n');
    await fetch(`${LocalApiEndpoint.CardGames.ExportUrlAudit}?filter=${encodeURIComponent(logKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-ndjson' }, body: ndjson,
    });
  }, [statusMap]);

  return {
    urls, loading, error,
    statusMap,
    filter, setFilter,
    filtered,
    url404List, urlFailedList,
    validating, progress,
    validate,
    exportFiltered,
    exportList,
  };
}
