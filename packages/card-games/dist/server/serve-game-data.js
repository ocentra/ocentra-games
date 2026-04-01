import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { openDb, closeDb, getDefaultDbPath, getProcessedGamesDir, queryGamesList, queryNamesForSlug, queryNamesAudit, queryUrlsAudit, buildGamesListPayload, emptyListPayload, buildUrlsAuditPayload, } from '../db/game-db.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function serveFromGameData(options) {
    const dbPath = getDefaultDbPath();
    const processedDir = getProcessedGamesDir();
    const packageRoot = path.resolve(__dirname, '..', '..');
    const logDir = options?.logDir ?? path.join(packageRoot, 'Log');
    let cachedListPayload = null;
    let cachedSlugToNames = new Map();
    let dbQueue = Promise.resolve();
    function enqueueDb(fn) {
        const p = dbQueue.then(() => fn());
        dbQueue = p.then(() => { }, () => { });
        return p;
    }
    return {
        name: 'serve-game-data',
        configureServer(server) {
            console.log('[serve-game-data] dbPath:', dbPath, '| exists:', fs.existsSync(dbPath));
            server.middlewares.use(LocalApiEndpoint.CardGames.MountBase, (req, res, next) => {
                const pathname = req.url?.split('?')[0] ?? '';
                const parsed = new URL(req.url ?? '', 'http://localhost');
                res.setHeader('Content-Type', 'application/json');
                if (pathname === LocalApiEndpoint.CardGames.GamesPath && (req.method === 'GET' || !req.method)) {
                    console.log('[api] GET /api/games');
                    const forceRefresh = parsed.searchParams.get('refresh') === '1';
                    if (!forceRefresh && cachedListPayload !== null) {
                        console.log('[api] /api/games → from cache');
                        res.end(cachedListPayload);
                        return;
                    }
                    if (forceRefresh) {
                        cachedListPayload = null;
                        cachedSlugToNames = new Map();
                        console.log('[api] /api/games → cache cleared (refresh=1)');
                    }
                    enqueueDb(async () => {
                        const handle = openDb(dbPath);
                        if (!handle) {
                            console.log('[api] /api/games → DB not found or not openable, returning empty list');
                            res.end(emptyListPayload());
                            return;
                        }
                        try {
                            const list = await queryGamesList(handle.conn);
                            console.log('[api] /api/games → query ok, rows:', list.length);
                            const { payload, slugToNames } = buildGamesListPayload(list);
                            const payloadStr = JSON.stringify(payload);
                            cachedListPayload = payloadStr;
                            cachedSlugToNames = slugToNames;
                            res.end(payloadStr);
                            console.log('[api] /api/games → response sent, games:', payload.games.length);
                        }
                        catch (e) {
                            const msg = String(e.message ?? e);
                            if (msg.includes('does not exist') || msg.includes('Catalog Error')) {
                                console.log('[api] /api/games → table missing (run db:init + ingest), returning empty list');
                                res.end(emptyListPayload());
                            }
                            else {
                                console.error('[api] /api/games → query error:', msg);
                                res.statusCode = 500;
                                res.end(JSON.stringify({ error: msg }));
                            }
                        }
                        finally {
                            closeDb(handle);
                        }
                    });
                    return;
                }
                if (pathname.startsWith(`${LocalApiEndpoint.CardGames.GamesPath}/`) && pathname.length > `${LocalApiEndpoint.CardGames.GamesPath}/`.length) {
                    const slug = decodeURIComponent(pathname.slice(`${LocalApiEndpoint.CardGames.GamesPath}/`.length)).replace(/\.json$/i, '');
                    const filePath = path.join(processedDir, slug + '.json');
                    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                        res.statusCode = 404;
                        res.end();
                        return;
                    }
                    let data;
                    try {
                        const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
                        data = JSON.parse(raw);
                    }
                    catch {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                        return;
                    }
                    const parse = (v) => {
                        if (v == null)
                            return undefined;
                        if (typeof v === 'object')
                            return v;
                        try {
                            return typeof v === 'string' ? JSON.parse(v) : v;
                        }
                        catch {
                            return undefined;
                        }
                    };
                    const cf = data.cursorFind && typeof data.cursorFind === 'object'
                        ? data.cursorFind
                        : {};
                    const source = data.source && typeof data.source === 'object' ? data.source : {};
                    const alsoKnownAs = Array.isArray(data.alsoKnownAs) ? data.alsoKnownAs : [];
                    const alsoCf = Array.isArray(cf.alsoKnownAs) ? cf.alsoKnownAs : [];
                    const finishDetail = (listNames) => {
                        const combined = [...new Set([...listNames, ...alsoKnownAs, ...alsoCf])];
                        const detail = {
                            filename: slug + '.json',
                            name: data.name ?? slug,
                            completeness: parse(data.completeness) ?? {},
                            quality: data.quality ?? 'placeholder',
                            overview: parse(data.overview),
                            history: parse(data.history),
                            setup: parse(data.setup),
                            rules: parse(data.rules),
                            strategy: parse(data.strategy),
                            variations: parse(data.variations),
                            sources: parse(data.sources),
                            ai: {},
                            pagat: data.pagat ? parse(data.pagat) : undefined,
                            source: source.url ? { url: source.url } : undefined,
                            cursorFind: {
                                alsoKnownAs: combined,
                                similarGames: parse(cf.similarGames) ?? [],
                            },
                        };
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(detail));
                    };
                    const fromCache = cachedSlugToNames.get(slug);
                    if (fromCache !== undefined) {
                        finishDetail(fromCache);
                        return;
                    }
                    enqueueDb(async () => {
                        const handle = openDb(dbPath);
                        if (!handle) {
                            finishDetail([]);
                            return;
                        }
                        try {
                            const listNames = await queryNamesForSlug(handle.conn, slug);
                            cachedSlugToNames.set(slug, listNames);
                            finishDetail(listNames);
                        }
                        catch (e) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: String(e.message) }));
                        }
                        finally {
                            closeDb(handle);
                        }
                    });
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.NamesAuditPath && (req.method === 'GET' || !req.method)) {
                    console.log('[api] GET /api/names-audit');
                    enqueueDb(async () => {
                        const handle = openDb(dbPath);
                        if (!handle) {
                            res.end(JSON.stringify({ rows: [], total: 0, message: 'DB not open' }));
                            return;
                        }
                        try {
                            const list = await queryNamesAudit(handle.conn);
                            res.end(JSON.stringify({ rows: list, total: list.length }));
                        }
                        catch (e) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: String(e.message), rows: [], total: 0 }));
                        }
                        finally {
                            closeDb(handle);
                        }
                    });
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.ReingestPath && (req.method === 'POST' || req.method === 'GET')) {
                    const result = spawnSync('npm', ['run', 'ingest'], { cwd: packageRoot, encoding: 'utf-8', timeout: 120000 });
                    if (result.status === 0) {
                        cachedListPayload = null;
                        cachedSlugToNames = new Map();
                    }
                    const payload = {
                        ok: result.status === 0,
                        exitCode: result.status,
                        stdout: (result.stdout ?? '').slice(-2000),
                        stderr: (result.stderr ?? '').slice(-1000),
                    };
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(payload));
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.UrlsAuditPath) {
                    console.log('[api] GET /api/urls-audit');
                    enqueueDb(async () => {
                        const handle = openDb(dbPath);
                        if (!handle) {
                            console.log('[api] /api/urls-audit → no DB, returning empty urls');
                            res.end(JSON.stringify({ urls: [] }));
                            return;
                        }
                        try {
                            const list = await queryUrlsAudit(handle.conn);
                            const { urls } = buildUrlsAuditPayload(list);
                            res.end(JSON.stringify({ urls }));
                        }
                        catch (e) {
                            const msg = String(e.message ?? e);
                            if (msg.includes('does not exist') || msg.includes('Catalog Error')) {
                                res.end(JSON.stringify({ urls: [] }));
                            }
                            else {
                                res.statusCode = 500;
                                res.end(JSON.stringify({ error: msg }));
                            }
                        }
                        finally {
                            closeDb(handle);
                        }
                    });
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.ExportGamesPath && (req.method === 'POST' || req.method === 'PUT')) {
                    const raw = parsed.searchParams.get('filter') ?? 'All';
                    const safeSuffix = raw.replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'All';
                    const chunks = [];
                    req.on('data', (c) => chunks.push(c));
                    req.on('end', () => {
                        const body = Buffer.concat(chunks).toString('utf-8');
                        if (!fs.existsSync(logDir))
                            fs.mkdirSync(logDir, { recursive: true });
                        const fname = `games-${safeSuffix}.ndjson`;
                        const outPath = path.join(logDir, fname);
                        try {
                            fs.writeFileSync(outPath, body);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true, path: `Log/${fname}` }));
                        }
                        catch (e) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: String(e.message) }));
                        }
                    });
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.ExportUrlAuditPath && (req.method === 'POST' || req.method === 'PUT')) {
                    const tableAllowed = new Set(['AllUrls', 'Failed', '404-only', 'NotInList', 'NotInJson']);
                    const listAllowed = new Set(['urls-404', 'urls-failed']);
                    const raw = parsed.searchParams.get('filter') ?? 'AllUrls';
                    const chunks = [];
                    req.on('data', (c) => chunks.push(c));
                    req.on('end', () => {
                        const body = Buffer.concat(chunks).toString('utf-8');
                        if (!fs.existsSync(logDir))
                            fs.mkdirSync(logDir, { recursive: true });
                        const fname = listAllowed.has(raw)
                            ? `${raw}.ndjson`
                            : tableAllowed.has(raw)
                                ? `url-audit-${raw}.ndjson`
                                : 'url-audit-AllUrls.ndjson';
                        const outPath = path.join(logDir, fname);
                        try {
                            fs.writeFileSync(outPath, body);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true, path: `Log/${fname}` }));
                        }
                        catch (e) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: String(e.message) }));
                        }
                    });
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.RunValidatePath && (req.method === 'POST' || req.method === 'GET')) {
                    const scriptPath = path.join(packageRoot, 'src', 'scripts', 'validate-with-ts-schema.ts');
                    if (!fs.existsSync(scriptPath)) {
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Validator script not found', path: scriptPath }));
                        return;
                    }
                    const result = spawnSync('npx', ['tsx', 'src/scripts/validate-with-ts-schema.ts', 'src/processed-games', '--json', '--skip-url-check'], { cwd: packageRoot, encoding: 'utf-8', timeout: 120000 });
                    const stdout = result.stdout ?? '';
                    const stderr = result.stderr ?? '';
                    let body;
                    try {
                        body = JSON.parse(stdout.trim() || '{}');
                    }
                    catch {
                        body = { ok: 0, fail: 0, results: [], raw: stdout.slice(0, 2000), stderr: stderr.slice(0, 500) };
                    }
                    const payload = typeof body === 'object' && body != null && 'ok' in body
                        ? { ...body, exitCode: result.status }
                        : body;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(payload));
                    return;
                }
                if (pathname === LocalApiEndpoint.CardGames.CheckUrlPath) {
                    const target = parsed.searchParams.get('url');
                    if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Missing or invalid url' }));
                        return;
                    }
                    const ctrl = new AbortController();
                    const t = setTimeout(() => ctrl.abort(), 10000);
                    fetch(target, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
                        .then((r) => {
                        clearTimeout(t);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ url: target, status: r.status, ok: r.ok }));
                    })
                        .catch((e) => {
                        clearTimeout(t);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ url: target, status: 0, ok: false, error: String(e.message ?? e) }));
                    });
                    return;
                }
                next();
            });
        },
    };
}
export function serveProcessedGames() {
    const gamesDir = getProcessedGamesDir();
    return {
        name: 'serve-processed-games',
        configureServer(server) {
            server.middlewares.use('/games', (req, res, next) => {
                const filePath = path.join(gamesDir, req.url ?? '');
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    res.setHeader('Content-Type', 'application/json');
                    fs.createReadStream(filePath).pipe(res);
                }
                else {
                    next();
                }
            });
        },
    };
}
