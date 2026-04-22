import * as fs from 'fs';
import * as path from 'path';
import type { TestLog, RunType, TestSuiteTypeValue, NdjsonLogEntry } from '@ocentra/logging-domain/test-log/types';
import { NdjsonLineType } from '@ocentra/logging-domain/test-log/types';
import { testLogToNdjsonEntry, ndjsonEntryToTestLog } from '@ocentra/logging-domain/test-log/bridgeConvert';
import { wipeNdjsonScope, type WipeSuiteType } from '@ocentra/logging-domain/test-log/wipeNdjsonScope';
import { writeLogEntry } from '@ocentra/logging-domain/test-log/ndjsonLogFileWriter';
import { getFileKeyFromSuitePath } from '@ocentra/logging-domain/test-log/ndjsonPaths';
import { asFileKey, asTestName } from '@ocentra/logging-domain/test-log/ndjsonBrands';
import { LogRealm } from '@ocentra/logging-domain/test-log/types';

export interface NdjsonWriterOptions {
  /** Must be the default consumer dir (e.g. getDefaultNdjsonOutputDir() + '/cloudflare') so writes from writeLogEntry go to the same root. */
  baseDir: string;
  getSuiteTypeFromPath?: (suitePath: string, cwd: string) => { type: TestSuiteTypeValue };
}

const defaultSuiteType = (): TestSuiteTypeValue => 'unit';

function getSuiteTypeWithFallback(
  suitePath: string | null,
  cwd: string,
  custom?: (suitePath: string, cwd: string) => { type: TestSuiteTypeValue }
): TestSuiteTypeValue {
  if (!suitePath) return defaultSuiteType();
  if (custom) return custom(suitePath, cwd).type;
  const lower = suitePath.toLowerCase();
  if (lower.includes('integration')) return 'integration';
  if (lower.includes('e2e')) return 'e2e';
  if (lower.includes('websocket')) return 'websocket';
  if (lower.includes('contract')) return 'contract';
  return 'unit';
}

export function sanitizeTestNameForFile(testName: string): string {
  const sanitized = testName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .substring(0, 100);
  return sanitized || 'unnamed-test';
}

export function extractSuiteFileName(suitePath: string): string {
  const fileName = suitePath.split(/[/\\]/).pop() || 'unknown';
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createNdjsonWriter(options: NdjsonWriterOptions) {
  const baseDir = path.resolve(options.baseDir);
  const getSuiteType = options.getSuiteTypeFromPath ?? ((p: string, cwd: string) => ({ type: getSuiteTypeWithFallback(p, cwd) }));

  function getNdjsonFilePath(
    runType: RunType,
    suiteType: TestSuiteTypeValue | string | null,
    suitePath: string | null,
    testName: string,
    cwd: string = process.cwd()
  ): string {
    const effectiveSuiteType =
      suiteType ??
      (suitePath ? getSuiteType(suitePath, cwd).type : defaultSuiteType());
    const suiteFileName = suitePath ? extractSuiteFileName(suitePath) : 'unknown.test.ts';
    const sanitizedTestName = sanitizeTestNameForFile(testName);
    return path.join(baseDir, runType, String(effectiveSuiteType), suiteFileName, `${sanitizedTestName}.ndjson`);
  }

  function ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function writeLogsToNdjson(runType: RunType, logs: TestLog[], cwd: string = process.cwd()): void {
    const logsByFile = new Map<string, TestLog[]>();
    for (const log of logs) {
      const filePath = getNdjsonFilePath(runType, log.suite_type, log.suite_path, log.test_name, cwd);
      const existing = logsByFile.get(filePath) || [];
      existing.push(log);
      logsByFile.set(filePath, existing);
    }
    for (const [, fileLogs] of logsByFile) {
      const first = fileLogs[0];
      const suiteType = String(first.suite_type ?? (first.suite_path ? getSuiteType(first.suite_path, cwd).type : defaultSuiteType()));
      const fileKeyRaw = first.suite_path ? getFileKeyFromSuitePath(first.suite_path) : 'unknown';
      const scope = { consumer: LogRealm.Cloudflare, runType, suiteType };
      const fileKey = asFileKey(fileKeyRaw);
      const name = asTestName(first.test_name);
      const lines = fileLogs.map((log) => JSON.stringify(testLogToNdjsonEntry(log, runType))).join('\n') + '\n';
      writeLogEntry(scope, fileKey, name, lines);
    }
  }

  function readNdjsonFile(filePath: string): NdjsonLogEntry[] {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter((line) => line.trim());
    return lines.map((line) => JSON.parse(line) as NdjsonLogEntry);
  }

  function getNdjsonFilesForRunType(runType: RunType): string[] {
    const runTypeDir = path.join(baseDir, runType);
    if (!fs.existsSync(runTypeDir)) return [];
    const files: string[] = [];
    function walkDir(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(fullPath);
        else if (entry.name.endsWith('.ndjson')) files.push(fullPath);
      }
    }
    walkDir(runTypeDir);
    return files;
  }

  const outputDir = path.dirname(baseDir);

  function wipeNdjsonForRunType(runType: RunType): void {
    wipeNdjsonScope({ runTypes: [runType], suiteType: 'all' }, outputDir);
  }

  function wipeNdjsonForTestFile(runType: RunType, testFile: string, cwd: string = process.cwd()): void {
    const suiteType = getSuiteType(testFile, cwd).type as WipeSuiteType;
    wipeNdjsonScope({ runTypes: [runType], suiteType, testFile }, outputDir);
  }

  function loadLogsFromNdjson(runType: RunType): Map<string, TestLog[]> {
    const logsByTest = new Map<string, TestLog[]>();
    const files = getNdjsonFilesForRunType(runType);
    for (const filePath of files) {
      const entries = readNdjsonFile(filePath) as (NdjsonLogEntry & { type?: string })[];
      for (const entry of entries) {
        const t = (entry as { type?: string }).type;
        if (t === NdjsonLineType.RunSummary || t === NdjsonLineType.TestResult) continue;
        const testLog = ndjsonEntryToTestLog(entry as NdjsonLogEntry);
        const existing = logsByTest.get(testLog.test_name) || [];
        existing.push(testLog);
        logsByTest.set(testLog.test_name, existing);
      }
    }
    return logsByTest;
  }

  function writeRunMetadata(
    runType: RunType,
    metadata: { runId: string; testFile: string; startTime: number; endTime?: number; testCount?: number }
  ): void {
    const runTypeDir = path.join(baseDir, runType);
    ensureDirectoryExists(path.join(runTypeDir, 'dummy'));
    const metaPath = path.join(runTypeDir, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  function getNdjsonStats(runType: RunType): { fileCount: number; logCount: number } {
    const files = getNdjsonFilesForRunType(runType);
    let logCount = 0;
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter((line) => line.trim());
      logCount += lines.length;
    }
    return { fileCount: files.length, logCount };
  }

  return {
    baseDir,
    sanitizeTestNameForFile,
    extractSuiteFileName,
    getNdjsonFilePath,
    writeLogsToNdjson,
    readNdjsonFile,
    getNdjsonFilesForRunType,
    wipeNdjsonForRunType,
    wipeNdjsonForTestFile,
    loadLogsFromNdjson,
    writeRunMetadata,
    getNdjsonStats,
  };
}
