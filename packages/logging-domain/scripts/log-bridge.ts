import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { RunType } from '../src/test-log/types';
import type { NdjsonLogEntry } from '../src/test-log/types';
import { BRIDGE_PORT } from '../src/core/constants';
import { getDefaultNdjsonOutputDir, getFileKeyFromSuitePath, getSuiteTypeFromPath, sanitizeTestNameForNdjson } from '../src/test-log/ndjsonPaths';
import { wipeNdjsonScope, type WipeScope } from '../src/test-log/wipeNdjsonScope';
import { getDirPath } from '../src/test-log/logsTree';
import { writeLogEntry, writeSummary } from '../src/test-log/ndjsonLogFileWriter';
import { asFileKey, asNdjsonSummaryContent, asTestName } from '../src/test-log/ndjsonBrands';
import type { LogsTreeScope } from '../src/test-log/logsTree';
import { LogRealm } from '../src/test-log/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');

interface BridgeLog {
  log_timestamp: number;
  level: string;
  consumer?: string;
  source: string | null;
  context: string | null;
  message: string;
  data: string | null;
  file: string | null;
  file_path: string | null;
  line: number | null;
  column: number | null;
  correlation_id: string | null;
  tags: string | null;
  stack: string | null;
  suite_path: string | null;
  suite_type: string | null;
  origin: string | null;
  environment?: string | null;
}

type StoredEntry = { testName: string; runId: string; log: BridgeLog; consumer: string; runType?: RunType };

const store: StoredEntry[] = [];

type RunInfo = { runId: string; runType: string; suiteType: string | null; startedAt: number };

const PORT = BRIDGE_PORT;
const OUTPUT_DIR = getDefaultNdjsonOutputDir();
const RUN_INFO_FILE = path.join(OUTPUT_DIR, '_bridge_current_run_info.json');

function readRunInfoFromFile(): RunInfo | null {
  try {
    if (!fs.existsSync(RUN_INFO_FILE)) return null;
    const raw = fs.readFileSync(RUN_INFO_FILE, 'utf-8');
    const data = JSON.parse(raw) as { runId?: string; runType?: string; suiteType?: string | null; startedAt?: number };
    if (typeof data.runId !== 'string' || typeof data.runType !== 'string') return null;
    return {
      runId: data.runId,
      runType: data.runType,
      suiteType: typeof data.suiteType === 'string' ? data.suiteType : null,
      startedAt: typeof data.startedAt === 'number' ? data.startedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeRunInfoToFile(info: RunInfo): void {
  try {
    const dir = path.dirname(RUN_INFO_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RUN_INFO_FILE, JSON.stringify(info), 'utf-8');
  } catch {
    /* ignore */
  }
}

const RECEIVED_LOG_PATH = path.join(PACKAGE_ROOT, '.bridge-received-temp.ndjson');
const RECEIVED_LOG_MAX_BODY = 2000;

function wipeReceivedLogForNewRun(): void {
  try {
    fs.writeFileSync(RECEIVED_LOG_PATH, '', 'utf-8');
  } catch {
    /* ignore */
  }
}

function appendReceivedNdjson(record: {
  receivedAt: string;
  path: string;
  bodyLength: number;
  entryCount: number;
  rawBodyTruncated?: string;
  error?: string;
  writtenAt?: string;
}): void {
  try {
    const writtenAt = new Date().toISOString();
    const line = JSON.stringify({ ...record, writtenAt }) + '\n';
    fs.appendFileSync(RECEIVED_LOG_PATH, line, 'utf-8');
  } catch {
    /* ignore */
  }
}

function appendRunStartedRecord(record: {
  event: 'run_started';
  startedAt?: string;
  runId?: string;
  receivedAt: string;
}): void {
  try {
    const writtenAt = new Date().toISOString();
    const line = JSON.stringify({ ...record, writtenAt }) + '\n';
    fs.appendFileSync(RECEIVED_LOG_PATH, line, 'utf-8');
  } catch {
    /* ignore */
  }
}

const envRunType = process.env.LOG_BRIDGE_RUN_TYPE;
const RUN_TYPE_FALLBACK: RunType =
  envRunType && Object.values(RunType).includes(envRunType as RunType)
    ? (envRunType as RunType)
    : RunType.SingleThreads;

const _CONSUMER = 'cloudflare';

function sanitizeConsumer(consumer: string): string {
  const s = consumer
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  return s || 'cloudflare';
}

function bridgeLogToNdjsonEntry(log: BridgeLog, testName: string, runId: string, runType: RunType): NdjsonLogEntry {
  return {
    ts: new Date(log.log_timestamp).toISOString(),
    runId,
    runType,
    suiteType: log.suite_type ?? 'unit',
    suitePath: log.suite_path ?? '',
    testName,
    testId: testName,
    cid: log.correlation_id ?? null,
    origin: log.origin ?? null,
    lvl: log.level,
    log: log.source ?? null,
    fn: log.context ?? null,
    file: log.file ?? log.file_path ?? null,
    line: log.line ?? null,
    col: log.column ?? null,
    msg: log.message,
    data: log.data ?? null,
    tags: log.tags ?? null,
    stack: log.stack ?? null,
    realm: log.consumer ?? null,
    environment: log.environment ?? null,
  };
}

function bridgeLogToNdjsonLine(log: BridgeLog, testName: string, runId: string, runType: RunType): string {
  return JSON.stringify(bridgeLogToNdjsonEntry(log, testName, runId, runType));
}

function flushRun(runId: string): { written: number; errors: string[]; runType?: RunType; consumer?: string; firstFilePath?: string } {
  const entries = store.filter((e) => e.runId === runId);
  if (entries.length === 0) {
    return { written: 0, errors: [], firstFilePath: undefined };
  }

  const firstConsumer = sanitizeConsumer(entries[0].consumer ?? 'cloudflare');
  const firstRunType = entries[0].runType ?? RUN_TYPE_FALLBACK;

  const byFile = new Map<string, { testName: string; runId: string; runType: RunType; logs: BridgeLog[] }>();
  for (const { testName, log, consumer: _entryConsumer, runType: entryRunType } of entries) {
    const runType = entryRunType ?? RUN_TYPE_FALLBACK;
    const suiteType = log.suite_type || 'unit';
    const fileKey = getFileKeyFromSuitePath(log.suite_path ?? '');
    const key = `${runType}\0${suiteType}\0${fileKey}\0${testName}`;
    if (!byFile.has(key)) byFile.set(key, { testName, runId, runType, logs: [] });
    byFile.get(key)!.logs.push(log);
  }

  let written = 0;
  const errors: string[] = [];
  let firstFilePath: string | undefined;

  for (const [, { testName, runId: rId, runType, logs }] of byFile) {
    const suiteType = logs[0]?.suite_type || 'unit';
    const fileKeyRaw = getFileKeyFromSuitePath(logs[0]?.suite_path ?? '');
    const scope = { consumer: LogRealm.Cloudflare, runType, suiteType };
    const fileKey = asFileKey(fileKeyRaw);
    const name = asTestName(testName);
    try {
      const lines = logs.map((log) => bridgeLogToNdjsonLine(log, testName, rId, runType)).join('\n') + (logs.length ? '\n' : '');
      writeLogEntry(scope, fileKey, name, lines);
      if (firstFilePath === undefined) firstFilePath = path.join(getDirPath(scope, fileKey), `${sanitizeTestNameForNdjson(testName)}.ndjson`);
      written += 1;
    } catch (err) {
      errors.push(`${runType}/${suiteType}/${fileKeyRaw}/${testName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const indicesToRemove: number[] = [];
  store.forEach((e, i) => {
    if (e.runId === runId) indicesToRemove.push(i);
  });
  for (let i = indicesToRemove.length - 1; i >= 0; i--) {
    store.splice(indicesToRemove[i], 1);
  }

  return { written, errors, runType: firstRunType, consumer: firstConsumer, firstFilePath };
}

function sendJson(res: http.ServerResponse, status: number, data: object): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  const parsed = new URL(url, `http://${req.headers.host}`);

  if (req.method === 'POST' && parsed.pathname === '/__logs__') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body) as Array<{
          testName: string;
          runId: string;
          log: BridgeLog;
          consumer?: string;
          runType?: RunType;
        }>;
        if (!Array.isArray(payload)) {
          sendJson(res, 400, { error: 'Body must be an array' });
          return;
        }
        for (const item of payload) {
          if (item && item.testName != null && item.runId != null && item.log != null) {
            const consumer = item.consumer ?? 'cloudflare';
            const runType =
              item.runType && Object.values(RunType).includes(item.runType) ? item.runType : undefined;
            store.push({
              testName: item.testName,
              runId: item.runId,
              log: item.log,
              consumer,
              runType,
            });
          }
        }
        const receivedAt = new Date().toISOString();
        const rawBodyTruncated =
          body.length > 0
            ? body.length > RECEIVED_LOG_MAX_BODY
              ? body.slice(0, RECEIVED_LOG_MAX_BODY) + '...[truncated]'
              : body
            : undefined;
        appendReceivedNdjson({
          receivedAt,
          path: '/__logs__',
          bodyLength: body.length,
          entryCount: payload.length,
          ...(rawBodyTruncated !== undefined && { rawBodyTruncated }),
        });
        sendJson(res, 200, { ok: true, stored: payload.length });
      } catch {
        const receivedAt = new Date().toISOString();
        appendReceivedNdjson({
          receivedAt,
          path: '/__logs__',
          bodyLength: body.length,
          entryCount: 0,
          rawBodyTruncated:
            body.length > 0
              ? body.length > RECEIVED_LOG_MAX_BODY
                ? body.slice(0, RECEIVED_LOG_MAX_BODY) + '...[truncated]'
                : body
              : undefined,
          error: 'Invalid JSON',
        });
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if ((req.method === 'POST' || req.method === 'GET') && parsed.pathname === '/__flush__') {
    const runIdParam = req.method === 'GET' ? parsed.searchParams.get('runId') : null;
    const doFlush = (id: string) => {
      const result = flushRun(id);
      sendJson(res, 200, { ok: true, runId: id, ...result });
    };
    if (req.method === 'GET') {
      if (!runIdParam) {
        sendJson(res, 400, { error: 'runId required (query param runId=)' });
        return;
      }
      doFlush(runIdParam);
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = body ? (JSON.parse(body) as { runId?: string }) : {};
        const id = data.runId ?? null;
        if (!id) {
          sendJson(res, 400, { error: 'runId required (body: { runId })' });
          return;
        }
        doFlush(id);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if ((req.method === 'POST' || req.method === 'GET') && parsed.pathname === '/__run_started__') {
    const receivedAt = new Date().toISOString();
    if (req.method === 'GET') {
      wipeReceivedLogForNewRun();
      appendRunStartedRecord({ event: 'run_started', receivedAt });
      sendJson(res, 200, { ok: true });
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      let startedAt: string | undefined;
      let runId: string | undefined;
      let runType: RunType | undefined;
      let testFiles: string[] | undefined;
      let suiteType: string | undefined;
      let wipeAll: boolean | undefined;
      if (body) {
        try {
          const data = JSON.parse(body) as {
            startedAt?: string;
            runId?: string;
            runType?: string;
            testFiles?: string[];
            suiteType?: string;
            wipeAll?: boolean;
          };
          startedAt = data.startedAt;
          runId = data.runId;
          if (data.runType && Object.values(RunType).includes(data.runType as RunType)) {
            runType = data.runType as RunType;
          }
          if (Array.isArray(data.testFiles)) {
            testFiles = data.testFiles.filter((s): s is string => typeof s === 'string');
          } else if (runType && !data.testFiles) {
            testFiles = [];
          }
          if (typeof data.suiteType === 'string' && data.suiteType.trim()) {
            suiteType = data.suiteType.trim().toLowerCase();
          }
          if (data.wipeAll === true) {
            wipeAll = true;
          }
        } catch {
          /* use defaults */
        }
      }
      wipeReceivedLogForNewRun();
      if (runId && runType !== undefined) {
        const info: RunInfo = { runId, runType, suiteType: suiteType ?? null, startedAt: Date.now() };
        writeRunInfoToFile(info);
      }
      if (wipeAll === true) {
        wipeNdjsonScope(
          { runTypes: [RunType.SinglePool, RunType.SingleThreads], suiteType: 'all' },
          OUTPUT_DIR
        );
      } else if (runType !== undefined) {
        const files = testFiles ?? [];
        if (files.length > 0) {
          for (const testFile of files) {
            wipeNdjsonScope(
              { runTypes: [runType], suiteType: getSuiteTypeFromPath(testFile) as WipeScope['suiteType'], testFile },
              OUTPUT_DIR
            );
          }
        } else {
          wipeNdjsonScope(
            {
              runTypes: [runType],
              suiteType: (suiteType?.trim() as WipeScope['suiteType']) ?? 'all',
            },
            OUTPUT_DIR
          );
        }
      }
      appendRunStartedRecord({ event: 'run_started', startedAt, runId, receivedAt });
      sendJson(res, 200, { ok: true });
    });
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/__reporter__') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const parsedBody = JSON.parse(body) as { payloads?: unknown[] } | unknown;
        const payloads: Array<{
          type: 'run_summary' | 'test_result';
          scope: { consumer?: string; runType?: string; suiteType?: string };
          fileKey: string;
          content?: string;
          testName?: string;
          lines?: string;
        }> = Array.isArray((parsedBody as { payloads?: unknown[] }).payloads)
          ? ((parsedBody as { payloads: unknown[] }).payloads as typeof payloads)
          : [parsedBody as (typeof payloads)[0]];
        let written = 0;
        const errors: string[] = [];
        for (const data of payloads) {
          if (!data || typeof data.type !== 'string' || !data.scope || typeof data.fileKey !== 'string') {
            errors.push('Missing type, scope, or fileKey');
            continue;
          }
          const scope: LogsTreeScope = {
            consumer: data.scope.consumer ?? LogRealm.Cloudflare,
            runType: data.scope.runType ?? RUN_TYPE_FALLBACK,
            suiteType: data.scope.suiteType ?? 'unit',
          };
          const fileKey = asFileKey(data.fileKey);
          try {
            if (data.type === 'run_summary') {
              if (typeof data.content !== 'string') {
                errors.push('run_summary requires content');
                continue;
              }
              writeSummary(scope, fileKey, asNdjsonSummaryContent(data.content));
              written++;
            } else if (data.type === 'test_result') {
              if (typeof data.testName !== 'string' || typeof data.lines !== 'string') {
                errors.push('test_result requires testName and lines');
                continue;
              }
              writeLogEntry(scope, fileKey, asTestName(data.testName), data.lines);
              written++;
            } else {
              errors.push('Unknown type');
            }
          } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
          }
        }
        sendJson(res, 200, { ok: true, written, errors: errors.length ? errors : undefined });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { error: msg });
      }
    });
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/__run_info__') {
    const info = readRunInfoFromFile();
    sendJson(res, 200, info
      ? { ok: true, runId: info.runId, runType: info.runType, suiteType: info.suiteType, startedAt: info.startedAt }
      : { ok: false, runId: null, runType: null, suiteType: null, startedAt: null });
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/__health__') {
    sendJson(res, 200, { ok: true, port: PORT, stored: store.length });
    return;
  }

  res.statusCode = 404;
  res.end('not found');
});

// Increase capacity for concurrent connections
server.maxConnections = 1000; // Allow up to 1000 concurrent connections
server.keepAliveTimeout = 120_000; // 2 minutes keep-alive
server.headersTimeout = 120_000; // 2 minutes headers timeout
server.requestTimeout = 30_000; // 30 seconds request timeout

server.listen(PORT, () => {
  process.stdout.write(`Log bridge listening on http://127.0.0.1:${PORT}\n`);
  process.stdout.write(`  POST /__run_started__ – wipe received log; optional body { runType, testFiles } wipes ND dirs\n`);
  process.stdout.write(`  POST /__logs__   – accept logs (body: [{ testName, runId, log, consumer? }])\n`);
  process.stdout.write(`  POST /__reporter__ – accept reporter NDJSON (run_summary / test_result)\n`);
  process.stdout.write(`  POST/GET /__flush__?runId=... – flush run to NDJSON under ${OUTPUT_DIR}\n`);
  process.stdout.write(`  GET /__run_info__ – current run info (runId, runType)\n`);
  process.stdout.write(`  GET /__health__ – health check\n`);
  process.stdout.write(`  Max connections: ${server.maxConnections}, Keep-alive: ${server.keepAliveTimeout}ms\n`);
});
