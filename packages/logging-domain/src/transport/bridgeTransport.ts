import type { InternalLogEntry } from '../types/internalLogEntry';
import { LogLevel } from '../types/logLevel';
import { LogConsumer, type BridgeLogPayload, type BridgeEntry } from './bridgeLogPayload';
import type { ILogTransport } from './logTransport';

export interface BridgeContext {
  consumer?: (typeof LogConsumer)[keyof typeof LogConsumer] | null;
  suitePath?: string | null;
  suiteType?: string | null;
  origin?: string | null;
  environment?: string | null;
}

const LOG_CONSUMER_VALUES: (typeof LogConsumer)[keyof typeof LogConsumer][] = [
  LogConsumer.Cloudflare,
  LogConsumer.Main,
  LogConsumer.Solana,
  LogConsumer.AssetEditor,
];

function levelToString(level: string): string {
  switch (level) {
    case LogLevel.Error:
      return 'error';
    case LogLevel.Warn:
      return 'warn';
    case LogLevel.Debug:
      return 'debug';
    default:
      return 'info';
  }
}

export function internalEntryToBridgeLog(
  entry: InternalLogEntry,
  ctx?: BridgeContext | null
): BridgeLogPayload {
  const data =
    entry.data !== undefined && entry.data !== null
      ? typeof entry.data === 'string'
        ? entry.data
        : JSON.stringify(entry.data)
      : null;
  const consumer: (typeof LogConsumer)[keyof typeof LogConsumer] =
    ctx?.consumer && LOG_CONSUMER_VALUES.includes(ctx.consumer)
      ? ctx.consumer
      : LogConsumer.Cloudflare;
  return {
    log_timestamp: entry.timestamp,
    level: levelToString(entry.level),
    consumer,
    source: entry.source ?? null,
    context: entry.context ?? null,
    message: entry.message,
    data,
    file: entry.file ?? null,
    file_path: entry.filePath ?? null,
    line: entry.line ?? null,
    column: entry.column ?? null,
    correlation_id: entry.correlationId ?? null,
    tags: null,
    stack: entry.stack ?? null,
    suite_path: ctx?.suitePath ?? null,
    suite_type: ctx?.suiteType ?? null,
    origin: ctx?.origin ?? null,
    environment: ctx?.environment ?? null,
  };
}

const LOGS_PATH = '/__logs__';
const REPORTER_PATH = '/__reporter__';
const HEALTH_PATH = '/__health__';
const BRIDGE_HEALTH_MAX_ATTEMPTS = 5; // Increased from 2
const BRIDGE_HEALTH_DELAY_MS = 100; // Increased from 50
const BRIDGE_SEND_MAX_ATTEMPTS = 5; // Increased from 3
const BRIDGE_SEND_DELAY_MS = 200; // Increased from 100
const BRIDGE_HEALTH_CACHE_TTL_MS = 15_000;

const healthCache: Record<string, number> = {};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearHealthCache(base: string): void {
  delete healthCache[base];
}

function isHealthCacheValid(base: string, now: number): boolean {
  const okAt = healthCache[base];
  if (okAt == null) return false;
  return now - okAt < BRIDGE_HEALTH_CACHE_TTL_MS;
}

async function isBridgeAlive(base: string): Promise<boolean> {
  const healthUrl = base.endsWith(HEALTH_PATH) ? base : `${base}${HEALTH_PATH}`;
  for (let attempt = 1; attempt <= BRIDGE_HEALTH_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      await res.text().catch(() => undefined);
      if (res.ok) {
        healthCache[base] = Date.now();
        if (typeof console !== 'undefined' && console.debug) {
          console.debug('[BridgeSend] health ok', base);
        }
        return true;
      }
    } catch {
      /* retry */
    }
    if (attempt < BRIDGE_HEALTH_MAX_ATTEMPTS) {
      await sleep(BRIDGE_HEALTH_DELAY_MS);
    }
  }
  clearHealthCache(base);
  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[BridgeSend] health failed', base);
  }
  return false;
}

export async function sendToBridge(entries: BridgeEntry[], endpoint: string): Promise<void> {
  if (entries.length === 0) return;
  const base = endpoint.endsWith('/') ? endpoint.slice(0, -1).replace(/\/+$/, '') : endpoint;
  const now = Date.now();
  let alive = isHealthCacheValid(base, now);
  if (!alive) {
    alive = await isBridgeAlive(base);
  }
  if (!alive) {
    throw new Error('Log bridge not reachable (health check failed)');
  }
  const url = base.endsWith(LOGS_PATH) ? base : `${base}${LOGS_PATH}`;
  const body = JSON.stringify(entries);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= BRIDGE_SEND_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (response.ok) {
        await response.text().catch(() => undefined);
        if (typeof console !== 'undefined' && console.debug) {
          console.debug('[BridgeSend] POST ok', attempt, entries.length);
        }
        return;
      }
      await response.text().catch(() => undefined);
      lastError = new Error(`Log bridge POST failed: ${response.status} ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[BridgeSend] attempt', attempt, lastError?.message ?? '');
    }
    if (attempt < BRIDGE_SEND_MAX_ATTEMPTS) {
      await sleep(BRIDGE_SEND_DELAY_MS);
    }
  }
  clearHealthCache(base);
  throw lastError ?? new Error('Log bridge POST failed');
}

const RUN_STARTED_PATH = '/__run_started__';
const RUN_INFO_PATH = '/__run_info__';

export async function fetchRunInfoFromBridge(endpoint: string): Promise<{ runId: string; runType: string; suiteType: string | null; startedAt: number | null } | null> {
  const base = endpoint.endsWith('/') ? endpoint.slice(0, -1).replace(/\/+$/, '') : endpoint;
  const url = `${base}${RUN_INFO_PATH}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return null;
    }
    const data = (await res.json()) as { ok?: boolean; runId?: string; runType?: string; suiteType?: string | null; startedAt?: number | null };
    if (data.ok && typeof data.runId === 'string') {
      return { runId: data.runId, runType: data.runType ?? '', suiteType: data.suiteType ?? null, startedAt: data.startedAt ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

export async function notifyBridgeRunStarted(
  endpoint: string,
  payload: { runId: string; runType: string; suiteType?: string; testFiles?: string[]; wipeAll?: boolean }
): Promise<boolean> {
  const base = endpoint.endsWith('/') ? endpoint.slice(0, -1).replace(/\/+$/, '') : endpoint;
  const url = `${base}${RUN_STARTED_PATH}`;
  const body = JSON.stringify({ startedAt: new Date().toISOString(), ...payload });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    await res.text().catch(() => undefined);
    return res.ok;
  } catch {
    return false;
  }
}

export type ReporterPayload = {
  type: 'run_summary' | 'test_result';
  scope: { consumer?: string; runType?: string; suiteType?: string };
  fileKey: string;
  content?: string;
  testName?: string;
  lines?: string;
};

const reporterQueue: Array<{ endpoint: string; payload: ReporterPayload }> = [];

export function enqueueReporterPayload(payload: ReporterPayload, endpoint: string): void {
  reporterQueue.push({ endpoint: endpoint.endsWith('/') ? endpoint.slice(0, -1).replace(/\/+$/, '') : endpoint, payload });
}

export async function sendReporterPayloadsToBridge(payloads: ReporterPayload[], endpoint: string): Promise<void> {
  if (payloads.length === 0) return;
  const base = endpoint.endsWith('/') ? endpoint.slice(0, -1).replace(/\/+$/, '') : endpoint;
  const now = Date.now();
  let alive = isHealthCacheValid(base, now);
  if (!alive) {
    alive = await isBridgeAlive(base);
  }
  if (!alive) {
    throw new Error('Log bridge not reachable (health check failed)');
  }
  const url = base.endsWith(REPORTER_PATH) ? base : `${base}${REPORTER_PATH}`;
  const body = JSON.stringify({ payloads });
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= BRIDGE_SEND_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (response.ok) {
        await response.text().catch(() => undefined);
        return;
      }
      await response.text().catch(() => undefined);
      lastError = new Error(`Log bridge reporter POST failed: ${response.status} ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < BRIDGE_SEND_MAX_ATTEMPTS) {
      await sleep(BRIDGE_SEND_DELAY_MS);
    }
  }
  clearHealthCache(base);
  throw lastError ?? new Error('Log bridge reporter POST failed');
}

export async function flushReporterQueue(): Promise<void> {
  if (reporterQueue.length === 0) return;
  const byEndpoint = new Map<string, ReporterPayload[]>();
  for (const { endpoint, payload } of reporterQueue) {
    const list = byEndpoint.get(endpoint) ?? [];
    list.push(payload);
    byEndpoint.set(endpoint, list);
  }
  reporterQueue.length = 0;
  const sends = Array.from(byEndpoint.entries(), ([endpoint, payloads]) =>
    sendReporterPayloadsToBridge(payloads, endpoint)
  );
  await Promise.all(sends);
}

/**
 * Transport that sends logs to a remote bridge server via HTTP
 */
export class BridgeTransport implements ILogTransport {
  readonly name = 'bridge';

  private defaultEndpoint: string | undefined;

  constructor(defaultEndpoint?: string) {
    this.defaultEndpoint = defaultEndpoint;
  }


  async emit(entries: BridgeEntry[], endpoint?: string): Promise<void> {
    const target = endpoint || this.defaultEndpoint;
    if (!target) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[BridgeTransport] No endpoint provided, skipping emit');
      }
      return;
    }
    await sendToBridge(entries, target);
  }
}
