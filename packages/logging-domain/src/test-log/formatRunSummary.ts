export interface RunSummaryInput {
  runId: string;
  runType: string;
  passed: number;
  failed: number;
  timeout?: number;
  unstable?: number;
}

export function formatRunSummary(input: RunSummaryInput): string {
  const {
    runId,
    runType,
    passed,
    failed = 0,
    timeout = 0,
    unstable = 0,
  } = input;
  const total = passed + failed + timeout + (unstable ?? 0);
  const status = failed === 0 && timeout === 0 ? 'passed' : 'failed';
  const allPassedOrUnstableOnly = failed === 0 && timeout === 0 && total > 0;

  const resultLine = allPassedOrUnstableOnly
    ? (unstable && unstable > 0
        ? '✅ ' + passed + ' passed' + (unstable ? ', ' + unstable + ' unstable' : '')
        : '✅ All ' + total + ' tests passed')
    : '❌ ' +
      [
        failed ? failed + ' failed' : null,
        passed ? passed + ' passed' : null,
        timeout ? timeout + ' timeout' : null,
        unstable && unstable > 0 ? unstable + ' unstable' : null,
      ]
        .filter(Boolean)
        .join(', ');
  const lines: string[] = [
    '',
    '📊 Run completed: ' + status,
    resultLine,
    '',
    '🔧 Query Commands:',
    '   npm run test:query -- failed ' + runId,
    '   npm run test:query -- by-run ' + runId,
    '   (with logs) $env:SHOW_LOGS="1"; npm run test:query -- by-run ' + runId,
    '   (use the run ID above; by-run only finds runs already ingested into DuckDB)',
    '',
    '📊 Total: ' +
      passed +
      ' passed, ' +
      failed +
      ' failed, ' +
      timeout +
      ' timeout, ' +
      (unstable ?? 0) +
      ' unstable',
    '🆔 Run ID: ' + runId + ' | Run Type: ' + runType,
  ];
  return lines.join('\n');
}
