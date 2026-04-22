import * as fs from 'fs';
import * as path from 'path';
import type { RunType, TestSuiteType } from '@ocentra/logging-domain/test-log/types';
import { getDefaultNdjsonOutputDir } from '@ocentra/logging-domain/test-log/ndjsonPaths';

const DELIMITER = '\0';

export type LogsTree = Map<string, string> & { readonly __brand: 'LogsTree' };

let cachedTree: LogsTree | null = null;
let cachedRoot: string | null = null;

export type LogsTreeScope = {
  consumer: string;
  runType: RunType | string;
  suiteType: TestSuiteType | string;
};

function buildCompositeKey(
  consumer: string,
  runType: string,
  suiteType: string,
  fileKey: string
): string {
  return [consumer, runType, suiteType, fileKey].join(DELIMITER);
}

export function buildLogsTree(logsRoot: string): LogsTree {
  const map = new Map<string, string>();
  const root = path.resolve(logsRoot);
  if (!fs.existsSync(root)) return map as LogsTree;

  const consumers = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
  for (const c of consumers) {
    const consumerPath = path.join(root, c.name);
    const runTypes = fs.readdirSync(consumerPath, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const r of runTypes) {
      const runTypePath = path.join(consumerPath, r.name);
      const suiteTypes = fs.readdirSync(runTypePath, { withFileTypes: true }).filter((e) => e.isDirectory());
      for (const s of suiteTypes) {
        const suitePath = path.join(runTypePath, s.name);
        const fileKeys = fs.readdirSync(suitePath, { withFileTypes: true }).filter((e) => e.isDirectory());
        for (const f of fileKeys) {
          const fileKeyPath = path.join(suitePath, f.name);
          const key = buildCompositeKey(c.name, r.name, s.name, f.name);
          map.set(key, fileKeyPath);
        }
      }
    }
  }

  return map as LogsTree;
}

export function getLogsTree(logsRoot?: string): LogsTree {
  if (cachedTree === null) {
    cachedRoot = logsRoot ?? getDefaultNdjsonOutputDir();
    cachedTree = buildLogsTree(cachedRoot);
  }
  return cachedTree;
}

export function refreshLogsTree(logsRoot?: string): void {
  cachedRoot = logsRoot ?? getDefaultNdjsonOutputDir();
  cachedTree = buildLogsTree(cachedRoot);
}

export function getDirPath(scope: LogsTreeScope, fileKey: string): string {
  const tree = getLogsTree();
  let dirPath = tryGet(tree, scope, fileKey);
  if (dirPath === undefined) {
    refreshLogsTree();
    const treeAfter = getLogsTree();
    dirPath = tryGet(treeAfter, scope, fileKey);
  }
  if (dirPath === undefined) {
    const root = cachedRoot ?? getDefaultNdjsonOutputDir();
    dirPath = path.join(root, scope.consumer, scope.runType as string, scope.suiteType as string, fileKey);
  }
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getDirPathWithRoot(logsRoot: string, scope: LogsTreeScope, fileKey: string): string {
  const root = path.resolve(logsRoot);
  const tree = buildLogsTree(root);
  let dirPath = tryGet(tree, scope, fileKey);
  if (dirPath === undefined) {
    dirPath = path.join(root, scope.consumer, scope.runType as string, scope.suiteType as string, fileKey);
  }
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getSummaryFilePath(
  scope: LogsTreeScope,
  fileKey: string,
  logsRoot?: string
): string {
  const root = path.resolve(logsRoot ?? getDefaultNdjsonOutputDir());
  const dirPath = path.join(
    root,
    scope.consumer,
    scope.runType as string,
    scope.suiteType as string,
    fileKey
  );
  return path.join(dirPath, `${fileKey}.ndjson`);
}

export function listFileKeysInScope(scope: LogsTreeScope, logsRoot?: string): string[] {
  const root = path.resolve(logsRoot ?? getDefaultNdjsonOutputDir());
  const scopeDir = path.join(root, scope.consumer, scope.runType as string, scope.suiteType as string);
  if (!fs.existsSync(scopeDir)) return [];
  const entries = fs.readdirSync(scopeDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export function tryGet(
  tree: LogsTree,
  scope: LogsTreeScope,
  fileKey: string
): string | undefined {
  const key = buildCompositeKey(
    scope.consumer,
    scope.runType as string,
    scope.suiteType as string,
    fileKey
  );
  return tree.get(key);
}

export function asLogsTree(map: Map<string, string>): LogsTree {
  return map as LogsTree;
}

export type RunSummaryFromNdjson = {
  run_id: string;
  run_type: string;
  suite_type: string;
  status: string;
  passed: number;
  failed: number;
  timeout: number;
  unstable: number;
  duration_ms?: number;
  ts: string;
};

export function getSummaryForTestFile(params: {
  runId: string;
  scope: LogsTreeScope;
  fileKey: string;
  logsRoot?: string;
}): RunSummaryFromNdjson | null {
  const { runId, scope, fileKey, logsRoot } = params;
  const summaryPath = getSummaryFilePath(scope, fileKey, logsRoot);
  if (!fs.existsSync(summaryPath)) return null;
  try {
    const content = fs.readFileSync(summaryPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const obj = JSON.parse(lines[i]) as { type?: string; run_id?: string; [k: string]: unknown };
      if (obj.type === 'run_summary' && obj.run_id === runId) {
        return {
          run_id: String(obj.run_id ?? ''),
          run_type: String(obj.run_type ?? ''),
          suite_type: String(obj.suite_type ?? ''),
          status: String(obj.status ?? ''),
          passed: Number(obj.passed ?? 0),
          failed: Number(obj.failed ?? 0),
          timeout: Number(obj.timeout ?? 0),
          unstable: Number(obj.unstable ?? 0),
          duration_ms: typeof obj.duration_ms === 'number' ? obj.duration_ms : undefined,
          ts: String(obj.ts ?? ''),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}
