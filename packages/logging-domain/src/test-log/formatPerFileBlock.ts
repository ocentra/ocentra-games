import * as fs from 'fs';
import * as path from 'path';
import type { RunSummaryFromNdjson } from './logsTree';
import { getSummaryForTestFile } from './logsTree';
import { getDefaultNdjsonOutputDir } from './ndjsonPaths';
import { LogRealm } from './types';

export function formatPerFileBlockFromSummary(
  summary: RunSummaryFromNdjson,
  fileKey: string
): string {
  const total = summary.passed + summary.failed + summary.timeout + summary.unstable;
  const testFile = path.basename(String(fileKey).replace(/\\/g, '/'));
  const resultLine =
    summary.status === 'passed'
      ? (summary.unstable > 0
          ? `✅ ${summary.passed} passed, ${summary.unstable} unstable`
          : `✅ All ${total} tests passed`)
      : `❌ ${[summary.failed && summary.failed + ' failed', summary.passed && summary.passed + ' passed', summary.timeout && summary.timeout + ' timeout', summary.unstable > 0 && summary.unstable + ' unstable'].filter(Boolean).join(', ')}`;
  return [
    '',
    '📊 Run completed: ' + summary.status,
    resultLine,
    '',
    '🔧 Query (this file):',
    '   npm run test:query -- by-run ' + summary.run_id + ' ' + testFile,
    '   (with logs) $env:SHOW_LOGS="1"; npm run test:query -- by-run ' + summary.run_id + ' ' + testFile,
    '',
    '📊 Total: ' +
      summary.passed +
      ' passed, ' +
      summary.failed +
      ' failed, ' +
      summary.timeout +
      ' timeout, ' +
      summary.unstable +
      ' unstable',
    '🆔 Run ID: ' + summary.run_id + ' | Run Type: ' + summary.run_type,
  ].join('\n');
}

type TestModuleEndPayload = {
  runId: string;
  runType: string;
  suiteType: string;
  fileKey: string;
};

export function appendPerFileBlockToTxt(
  payload: TestModuleEndPayload,
  resultsPath: string,
  logsRoot?: string
): void {
  const scope = {
    consumer: LogRealm.Cloudflare,
    runType: payload.runType,
    suiteType: payload.suiteType,
  };
  const summary = getSummaryForTestFile({
    runId: payload.runId,
    scope,
    fileKey: payload.fileKey,
    logsRoot: logsRoot ?? getDefaultNdjsonOutputDir(),
  });
  if (!summary) return;
  const total = summary.passed + summary.failed + summary.timeout + summary.unstable;
  const testFile = path.basename(String(payload.fileKey).replace(/\\/g, '/'));
  const durationMs = summary.duration_ms ?? 0;
  const header = `✓ ${testFile} (${total} tests) ${durationMs}ms`;
  const block = formatPerFileBlockFromSummary(summary, payload.fileKey);
  const indented = block
    .split('\n')
    .map((l) => (l ? '    ' + l : l))
    .join('\n');
  const line = header + '\n\n' + indented + '\n\n';
  try {
    fs.appendFileSync(resultsPath, line, 'utf-8');
  } catch {
    /* ignore */
  }
}
