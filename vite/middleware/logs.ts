import type { ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { isExactMountMatch } from '@ocentra/endpoint-domain/utils/connect-mount';
import { getLogStorage, getViteLogStorage } from '../utils/logStorageFactory';
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogQuery } from '@ocentra/logging-domain/types/logQuery';
import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';

function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseNdjson(body: string): Array<Omit<LogEntry, 'id' | 'origin'> & { id?: string; origin?: string }> {
  const lines = body.trim().split('\n').filter(Boolean);
  const entries: Array<Omit<LogEntry, 'id' | 'origin'> & { id?: string; origin?: string }> = [];
  for (const line of lines) {
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      entries.push({
        id: typeof raw.id === 'string' ? raw.id : undefined,
        origin: typeof raw.origin === 'string' ? raw.origin : undefined,
        level: (typeof raw.level === 'string' ? raw.level : 'info') as LogLevel,
        context: typeof raw.context === 'string' ? raw.context : '',
        message: typeof raw.message === 'string' ? raw.message : String(raw.message ?? ''),
        source: typeof raw.source === 'string' ? raw.source : 'main',
        timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
        args: Array.isArray(raw.args) ? raw.args : undefined,
        stack: typeof raw.stack === 'string' ? raw.stack : undefined,
        stackFrames: Array.isArray(raw.stackFrames) ? raw.stackFrames : undefined,
        file: typeof raw.file === 'string' ? raw.file : undefined,
        filePath: typeof raw.filePath === 'string' ? raw.filePath : undefined,
        line: typeof raw.line === 'number' ? raw.line : undefined,
        column: typeof raw.column === 'number' ? raw.column : undefined,
      });
    } catch {
      // skip malformed line
    }
  }
  return entries;
}

function getStorageForScope(scope: string | null): ReturnType<typeof getLogStorage> {
  if (scope === 'vite') return getViteLogStorage();
  return getLogStorage();
}

function getQueryParams(req: Connect.IncomingMessage): URLSearchParams {
  const url = req.url ?? '';
  const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  return new URLSearchParams(q);
}

function paramsToLogQuery(params: URLSearchParams): LogQuery {
  const level = params.get('level');
  const source = params.get('source');
  const context = params.get('context');
  const since = params.get('since');
  const until = params.get('until');
  const limit = Math.min(parseInt(params.get('limit') ?? '100', 10) || 100, 1000);
  return {
    ...(level ? { level: level as LogLevel } : {}),
    ...(source ? { source } : {}),
    ...(context ? { context } : {}),
    ...(since ? { since } : {}),
    ...(until ? { until } : {}),
    limit,
  };
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function ensureLogs(result: LogEntry[] | Promise<LogEntry[]>): Promise<LogEntry[]> {
  return Promise.resolve(result);
}

async function ensureStats(result: unknown): Promise<unknown> {
  return Promise.resolve(result);
}

async function ensureClear(result: number | Promise<number>): Promise<number> {
  return Promise.resolve(result);
}

const echoLogsToTerminal = process.env.VITE_ECHO_LOGS_TO_TERMINAL === '1';

function echoEntryToTerminal(e: { message: string; level: string; timestamp?: number; args?: unknown[] }): void {
  const ts = new Date(typeof e.timestamp === 'number' ? e.timestamp : Date.now()).toISOString();
  const data = e.args && e.args.length > 0 ? ` ${JSON.stringify(e.args)}` : '';
  process.stdout.write(`[${ts}] [${e.level}] ${e.message}${data}\n`);
}

export function setupLogsMiddleware(middlewares: Connect.Server): void {
  middlewares.use(LocalApiEndpoint.Logs.Base, async (req, res, next) => {
    setCors(res);
    if (req.method === HttpMethod.Options) {
      res.writeHead(200);
      res.end();
      return;
    }
    const isBasePath = isExactMountMatch(req.url ?? '');
    if (req.method === HttpMethod.Post && isBasePath) {
      try {
        const body = await readBody(req);
        const entries = parseNdjson(body);
        const storage = getLogStorage();
        storage.storeLogsBatch(entries);
        if (echoLogsToTerminal && entries.length > 0) {
          for (const e of entries) echoEntryToTerminal(e);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
      return;
    }
    next();
  });

  middlewares.use(LocalApiEndpoint.Logs.Query, async (req, res, next) => {
    if (req.method !== HttpMethod.Get) return next();
    setCors(res);
    try {
      const params = getQueryParams(req);
      const scope = params.get(QueryParam.Scope);
      const query = paramsToLogQuery(params);
      const storage = getStorageForScope(scope);
      const logs = await ensureLogs(storage.queryLogs(query));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: [], error: error instanceof Error ? error.message : String(error) }));
    }
  });

  middlewares.use(LocalApiEndpoint.Logs.Stats, async (req, res, next) => {
    if (req.method !== HttpMethod.Get) return next();
    setCors(res);
    try {
      const params = getQueryParams(req);
      const scope = params.get(QueryParam.Scope);
      const source = params.get('source') ?? undefined;
      const storage = getStorageForScope(scope);
      const stats = await ensureStats(storage.getStats(source));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });

  middlewares.use(LocalApiEndpoint.Logs.Clear, async (req, res, next) => {
    if (req.method !== HttpMethod.Delete) return next();
    setCors(res);
    try {
      const params = getQueryParams(req);
      const scope = params.get(QueryParam.Scope);
      const storage = getStorageForScope(scope);
      await ensureClear(storage.clearLogs());
      res.writeHead(204);
      res.end();
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
}
