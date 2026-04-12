function isValidAuditUrl(url) {
    const u = url.trim();
    if (!u || u === 'http' || u === 'https')
        return false;
    return /^https?:\/\/[^/]+/.test(u);
}
function normalizeUrl(u) {
    const trimmed = u.trim();
    return trimmed.endsWith('/') ? trimmed.slice(0, -1).replace(/\/+$/, '') : trimmed;
}
export function buildUrlsAuditPayload(rows) {
    const byUrl = new Map();
    for (const r of rows) {
        if (!isValidAuditUrl(r.source_url))
            continue;
        const key = normalizeUrl(r.source_url);
        if (!key)
            continue;
        if (!byUrl.has(key))
            byUrl.set(key, { names: [], slugs: [] });
        const e = byUrl.get(key);
        if (!e.slugs.includes(r.slug))
            e.slugs.push(r.slug);
        if (r.display_name != null && !e.names.includes(r.display_name))
            e.names.push(r.display_name);
    }
    const urls = Array.from(byUrl.entries()).map(([url, v]) => ({
        url,
        listNames: v.names,
        listPaths: [],
        jsonSlugs: v.slugs,
    }));
    return { urls };
}
