#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { TestLogDuckDb, getDefaultDbPath, DEFAULT_DOMAIN } from '../src/test-log/testLogDuckDb';
import { getChangedFiles } from '../src/test-log/ingestManifest';
import { RunType as RunTypeConst, type TestRun, type TestLog, type RunType, type TestSuiteType } from '../src/test-log/types';

const command = process.argv[2];
const args = process.argv.slice(3);

function showUsage(): void {
  console.log(`
Test Log Query Tool (DuckDB)

Usage:
  query-test-logs.ts <command> [args]

Commands:
  failed [run-id] [test-file] [--rid RUN_ID] [--run-type=single-pool|single-threads] [--suite-type=unit|integration|e2e|contract] [--limit N] [--include-logs]
  logs <test-name> [--run-id ID] [--level LEVEL] [--context CONTEXT] [--source SOURCE] [--file FILE] [--tags TAGS]
  errors <test-name> [--run-id ID] [--context CONTEXT] [--source SOURCE]
  search <query> [--test-name NAME] [--run-id ID]
  context <query> [--test-name NAME] [--run-id ID]
  test <test-name> [run-id] [--run-type single|full]
  list [test-file] [--run-type single|full]
  by-error <error-code> [--run-id ID]
  by-run <run-id> [test-file] [--include-logs] [--errors-only]
  (npm strips --errors-only; use ERRORS_ONLY=1 for errors-only with logs)
  stats [--run-id ID] [--run-type=single-pool|single-threads] [--suite-type=unit|integration|e2e|contract]

Examples (run from infra/cloudflare):
  npm run test:query:failed                              ← all failures (both pool + threads)
  npm run test:query:failed:unit                         ← unit failures only (do NOT use --suite-type=unit; npm strips it)
  npm run test:query:failed:integration                  ← integration only
  npm run test:query:failed:e2e                         ← e2e only
  npm run test:query:failed:unit:pool                    ← unit, single-pool only
  SUITE_TYPE=unit npm run test:query -- failed           ← unit-only via env (when not using dedicated script)
  npm run test:query -- test "<test-name>" <run-id>      ← full logs for a specific test
  npm run test:query:stats                               ← stats (all)
  npm run test:query:stats:unit                          ← stats unit only
  npm run test:query:stats:unit:pool                    ← stats unit, pool only

Note: npm run test:query -- failed --suite-type=unit does NOT work (npm treats --suite-type as npm config and strips it). Use npm run test:query:failed:unit or SUITE_TYPE=unit npm run test:query -- failed.
Note: npm may also strip --limit. Use FAILED_LIMIT=200 npm run test:query -- failed <run-id> (or run script directly from packages/logging-domain).
This script only queries DuckDB; it never ingests. If the DB is stale (new/changed NDJSON), run: npm run db:rebuild (from packages/logging-domain). Use --domain=cloudflare|main|solana|default for per-domain DB.
`);
}

function formatTestRun(run: TestRun): string {
  const statusIcon =
    run.status === 'passed'
      ? '✅'
      : run.status === 'failed'
        ? '❌'
        : run.status === 'timeout'
          ? '⏱️'
          : run.status === 'unstable'
            ? '⏭️'
            : '❓';
  const duration = run.duration_ms ? ` (${run.duration_ms}ms)` : '';
  let output = `${statusIcon} ${run.test_name}${duration}\n`;
  if (run.test_file) output += `   File: ${run.test_file}\n`;
  if (run.test_suite) output += `   Suite: ${run.test_suite}\n`;
  if (run.run_type) output += `   Run Type: ${run.run_type}\n`;
  if (run.run_id) output += `   Run ID: ${run.run_id}\n`;
  if (run.status === 'unknown') output += `   Status: unknown (no test_result in NDJSON)\n`;
  if (run.error_code) output += `   Error Code: ${run.error_code}\n`;
  if (run.error_message) output += `   Error: ${run.error_message.substring(0, 200)}${run.error_message.length > 200 ? '...' : ''}\n`;
  if (run.tags) output += `   Tags: ${run.tags}\n`;
  return output;
}

function seeLogsCommand(t: TestRun): string {
  const q = t.test_name.includes('"') ? t.test_name.replace(/"/g, '\\"') : t.test_name;
  return `npm run test:query -- test "${q}" ${t.run_id}`;
}

function formatCommandLine(cmd: string): string {
  return `   ${cmd}`;
}

function formatTerminalDump(dump: string): string {
  return dump.split(/\r?\n/).map((l) => `   ${l}`).join('\n');
}

function formatLog(log: TestLog): string {
  const levelIcon = log.level === 'error' ? '🔴' : log.level === 'warn' ? '🟡' : log.level === 'info' ? '🔵' : '⚪';
  const source = log.source ? `[${log.source}]` : '';
  const context = log.context ? `[${log.context}]` : '';
  const file = log.file ? `(${log.file}${log.line ? `:${log.line}` : ''})` : '';
  const tags = log.tags ? ` #${log.tags.split(',').join(' #')}` : '';
  const time = new Date(log.log_timestamp).toISOString().substring(11, 23);
  let output = `${levelIcon} ${time} ${source}${context} ${file}${tags}\n   ${log.message}`;
  if (log.data) {
    try {
      output += `\n   Data: ${JSON.stringify(JSON.parse(log.data), null, 2)}`;
    } catch {
      output += `\n   Data: ${log.data}`;
    }
  }
  if (log.stack) output += `\n   Stack: ${log.stack}`;
  return output;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const VALID_SUITE_TYPES = ['unit', 'integration', 'e2e', 'contract', 'websocket'] as const;

// ── ANSI colours & badge helpers ──────────────────────────────────────────────
const C = {
  reset:     '\x1b[0m',
  bold:      '\x1b[1m',
  dim:       '\x1b[2m',
  red:       '\x1b[31m',
  green:     '\x1b[32m',
  yellow:    '\x1b[33m',
  blue:      '\x1b[34m',
  magenta:   '\x1b[35m',
  cyan:      '\x1b[36m',
  white:     '\x1b[37m',
  brightWhite: '\x1b[97m',
  bgRed:     '\x1b[41m',
  bgGreen:   '\x1b[42m',
  bgYellow:  '\x1b[43m',
  bgBlue:    '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan:    '\x1b[46m',
};

function badge(icon: string, text: string): string {
  return `${icon} ${text}`;
}

function fileBadge(name: string): string {
  return badge('📄', name);
}

function suiteBadge(suite: string): string {
  switch (suite) {
    case 'unit':        return badge('⚡', 'unit');
    case 'integration': return badge('🔗', 'integration');
    case 'e2e':         return badge('🌐', 'e2e');
    default:            return badge('📋', suite);
  }
}

function modeBadge(mode: string, dur: string): string {
  const label = dur ? `${mode} ${dur}` : mode;
  if (mode === 'pool')    return badge('🏊', label);
  if (mode === 'threads') return badge('🧵', label);
  return badge('▶', label);
}

function bothTag(): string {
  return `${C.bold}🔴 BOTH${C.reset}`;
}

function parseArgs(args: string[]): {
  testFile?: string;
  testName?: string;
  runId?: string;
  runType?: RunType;
  suiteType?: TestSuiteType;
  errorCode?: string;
  level?: string;
  context?: string;
  source?: string;
  file?: string;
  tags?: string;
  showLogs?: boolean;
  bothOnly?: boolean;
  limit?: number;
} {
  const result: Record<string, string | boolean | undefined> = {};
  if (args.includes('--show-logs') || args.includes('--include-logs') || process.env.SHOW_LOGS === '1' || process.env.SHOW_LOGS === 'true') {
    result.showLogs = true;
  }
  if (args.includes('--both-only') || args.includes('--both')) {
    result.bothOnly = true;
  }
  const positionalArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--rid' || arg === '--runId' || arg === '--run-id' || arg === '-r' || arg.startsWith('--rid=') || arg.startsWith('--run-id=')) {
      result.runId = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--run-type' || arg.startsWith('--run-type=')) {
      result.runType = (arg.includes('=') ? arg.split('=')[1] : args[++i]) as RunType;
    } else if (arg === '--suite-type' || arg.startsWith('--suite-type=')) {
      const v = (arg.includes('=') ? arg.split('=')[1] : args[++i])?.toLowerCase();
      if (v && VALID_SUITE_TYPES.includes(v as (typeof VALID_SUITE_TYPES)[number])) {
        result.suiteType = v as (typeof VALID_SUITE_TYPES)[number];
      }
    } else if (arg === '--error-code' || arg.startsWith('--error-code=')) {
      result.errorCode = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--test-name' || arg.startsWith('--test-name=')) {
      result.testName = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--level' || arg.startsWith('--level=')) {
      result.level = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--context' || arg.startsWith('--context=')) {
      result.context = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--source' || arg.startsWith('--source=')) {
      result.source = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--file' || arg.startsWith('--file=')) {
      result.file = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--tags' || arg.startsWith('--tags=')) {
      result.tags = arg.includes('=') ? arg.split('=')[1] : args[++i];
    } else if (arg === '--limit' || arg.startsWith('--limit=')) {
      const raw = arg.includes('=') ? arg.split('=')[1] : args[++i];
      const n = Number.parseInt(String(raw ?? ''), 10);
      if (Number.isInteger(n) && n > 0) result.limit = n;
    } else if (arg.endsWith('.test.ts')) {
      result.testFile = arg;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      positionalArgs.push(arg);
    }
  }
  if (positionalArgs.length >= 2 && isUUID(positionalArgs[1]) && !result.runId) {
    result.testName = positionalArgs[0];
    result.runId = positionalArgs[1];
  } else if (positionalArgs.length > 0 && !result.runId && !result.testName) {
    result.runId = isUUID(positionalArgs[0]) ? positionalArgs[0] : undefined;
    result.testName = result.runId ? undefined : positionalArgs[0];
  }
  if (!result.runId && process.env.RUN_ID) {
    result.runId = process.env.RUN_ID;
  }
  if (!result.runType && process.env.RUN_TYPE) {
    const v = process.env.RUN_TYPE.trim();
    if (Object.values(RunTypeConst).includes(v as RunType)) result.runType = v as RunType;
  }
  if (!result.suiteType && process.env.SUITE_TYPE) {
    const v = process.env.SUITE_TYPE.trim().toLowerCase();
    if (VALID_SUITE_TYPES.includes(v as (typeof VALID_SUITE_TYPES)[number])) {
      result.suiteType = v as (typeof VALID_SUITE_TYPES)[number];
    }
  }
  if (result.limit == null && process.env.FAILED_LIMIT) {
    const n = Number.parseInt(process.env.FAILED_LIMIT, 10);
    if (Number.isInteger(n) && n > 0) result.limit = n;
  }
  return result as ReturnType<typeof parseArgs>;
}

function parseDomain(): string {
  for (const arg of args) {
    if (arg.startsWith('--domain=')) {
      const v = arg.slice('--domain='.length).trim();
      return v || DEFAULT_DOMAIN;
    }
  }
  return process.env.LOG_DB_DOMAIN ?? DEFAULT_DOMAIN;
}

function getLogsCloudflareBase(): string {
  return path.join(path.dirname(getDefaultDbPath(parseDomain())), '..', 'logs', 'cloudflare');
}

function discoverRunTypes(logsBase: string): string[] {
  if (!fs.existsSync(logsBase)) return [];
  const entries = fs.readdirSync(logsBase, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function checkDbFreshness(
  domain: string | undefined,
  scopeRunType?: RunType,
  scopeSuiteType?: string
): { ok: true } | { ok: false; message: string } {
  const logsBase = getLogsCloudflareBase();
  if (scopeRunType != null) {
    const logsDir =
      scopeSuiteType != null && scopeSuiteType.trim() !== ''
        ? path.join(logsBase, scopeRunType, scopeSuiteType.trim())
        : path.join(logsBase, scopeRunType);
    const { newFiles, changedFiles } = getChangedFiles(logsDir, domain);
    if (newFiles.length > 0 || changedFiles.length > 0) {
      const total = newFiles.length + changedFiles.length;
      const scopeDesc = scopeSuiteType ? `${scopeRunType}/${scopeSuiteType}` : scopeRunType;
      return {
        ok: false,
        message: `DB is stale: ${total} new/changed NDJSON file(s) under ${scopeDesc}. Run: npm run db:rebuild (from packages/logging-domain) then re-run this query.`,
      };
    }
    return { ok: true };
  }
  const runTypes = discoverRunTypes(logsBase);
  for (const runType of runTypes) {
    const logsDir =
      scopeSuiteType != null && scopeSuiteType.trim() !== ''
        ? path.join(logsBase, runType, scopeSuiteType.trim())
        : path.join(logsBase, runType);
    if (!fs.existsSync(logsDir)) continue;
    const { newFiles, changedFiles } = getChangedFiles(logsDir, domain);
    if (newFiles.length > 0 || changedFiles.length > 0) {
      const total = newFiles.length + changedFiles.length;
      const scopeDesc = scopeSuiteType ? `${runType}/${scopeSuiteType}` : runType;
      return {
        ok: false,
        message: `DB is stale: ${total} new/changed NDJSON file(s) under ${scopeDesc}. Run: npm run db:rebuild (from packages/logging-domain) then re-run this query.`,
      };
    }
  }
  return { ok: true };
}

function formatElapsed(ms: number): string {
  if (ms >= 60000) {
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

async function run(): Promise<void> {
  const startMs = Date.now();
  const domain = parseDomain();
  const scope = parseArgs(args);
  const skipFreshnessCheck = ['by-run', 'test', 'logs', 'errors', 'search', 'context', 'by-error'].includes(command ?? '');
  if (!skipFreshnessCheck) {
    const freshness = checkDbFreshness(domain, scope.runType, scope.suiteType);
    if (!freshness.ok) {
      console.error(freshness.message);
      process.exitCode = 1;
      return;
    }
  }
  const dbPath = getDefaultDbPath(domain);
  const db = await TestLogDuckDb.create({ dbPath });
  try {
    switch (command) {
      case 'failed': {
        const parsed = parseArgs(args);
        if (process.env.RUN_ID && !parsed.runId) parsed.runId = process.env.RUN_ID;
        if (parsed.runId) {
          const stats = await db.getTestStats(parsed.runId);
          if (stats.total === 0) {
            console.log(`❌ No tests found for run ID: ${parsed.runId}`);
            return;
          }
        } else {
          console.log(`\n⚠️  No run-id specified. Showing ALL failed tests from ALL runs.\n`);
        }
        const failed = await db.getFailedOrTimeoutTests({
          test_file: parsed.testFile,
          suite_type: parsed.suiteType,
          run_id: parsed.runId,
          run_type: parsed.runType,
          error_code: parsed.errorCode,
          limit: parsed.limit ?? 100,
        });
        if (failed.length === 0) {
          console.log(`✅ No failed or timeout tests`);
          if (parsed.runId) {
            const runStats = await db.getTestStats(parsed.runId);
            console.log(
              `   Run ${parsed.runId}: ${runStats.total} total, ${runStats.passed} passed, ${runStats.failed} failed, ${runStats.timeout} timeout, ${runStats.unstable} unstable${runStats.unknown > 0 ? `, ${runStats.unknown} unknown` : ''}`
            );
            if (runStats.total === 0) {
              console.log(`   (No test_result rows for this run in DuckDB; run may not be ingested yet or NDJSON had no test_result lines.)`);
            }
          } else {
            console.log(`   (Runs with status 'unknown' have no test_result line in NDJSON; use test report for full overview.)`);
          }
          return;
        }
        const filters: string[] = [];
        if (parsed.testFile) filters.push(`file: ${parsed.testFile}`);
        if (parsed.suiteType) filters.push(`suite: ${parsed.suiteType}`);
        if (parsed.runId) filters.push(`run: ${parsed.runId}`);
        if (parsed.runType) filters.push(`type: ${parsed.runType}`);
        if (parsed.errorCode) filters.push(`error: ${parsed.errorCode}`);
        const terminalDumps = parsed.showLogs && parsed.runId ? new Map((await db.getTerminalDumpsByRunId(parsed.runId)).map((d) => [d.test_id, d.terminal_dump])) : new Map<string, string>();

        // Group by test_name so pool+threads failures for the same test appear together
        const grouped = new Map<string, TestRun[]>();
        for (const test of failed) {
          const existing = grouped.get(test.test_name);
          if (existing) existing.push(test);
          else grouped.set(test.test_name, [test]);
        }

        const bothCount = [...grouped.values()].filter((g) => g.length > 1).length;
        const uniqueCount = grouped.size;

        // --both-only: keep only tests that fail in both modes
        if (parsed.bothOnly) {
          for (const [name, tests] of grouped) {
            if (tests.length < 2) grouped.delete(name);
          }
          if (grouped.size === 0) {
            console.log(`\n✅ No tests fail in both modes (pool + threads).`);
            return;
          }
        }

        const groupInfo = bothCount > 0 ? `, ${bothCount} in both modes` : '';
        const DIV  = `${C.dim}───────────────────────────────────────────────────────────────────────────────${C.reset}`;
        const HDIV = `${C.bold}═══════════════════════════════════════════════════════════════════════════════${C.reset}`;

        let runStatsLine: string | null = null;
        if (parsed.runId) {
          const runStats = await db.getTestStats(parsed.runId);
          runStatsLine = `Run in DuckDB: ${runStats.total} total, ${runStats.passed} passed, ${runStats.failed} failed, ${runStats.timeout} timeout, ${runStats.unstable} unstable${runStats.unknown > 0 ? `, ${runStats.unknown} unknown` : ''}`;
        }

        console.log('');
        console.log(HDIV);
        if (parsed.bothOnly) {
          console.log(`  ${C.red}${C.bold}${grouped.size} FAILED${C.reset} in ${C.bold}BOTH${C.reset} modes (pool + threads)`);
        } else {
          console.log(`  ${C.red}${C.bold}${failed.length} FAILED${C.reset}  (${uniqueCount} unique${groupInfo})`);
          if (filters.length) console.log(`  ${C.dim}Filters: ${filters.join(', ')}${C.reset}`);
          if (runStatsLine) console.log(`  ${C.dim}${runStatsLine}${C.reset}`);
          if ((parsed.limit ?? 100) <= failed.length) {
            const shown = failed.length;
            if (parsed.limit == null) {
              console.log(`  ${C.dim}Showing first ${shown} results. Use FAILED_LIMIT=N (or --limit N when running script directly).${C.reset}`);
            } else {
              console.log(`  ${C.dim}Showing first ${shown} results due to limit=${parsed.limit}.${C.reset}`);
            }
          }
          if (bothCount > 0 && !parsed.runType) {
            console.log(`  ${C.dim}Show only both:${C.reset}  npm run test:query -- failed --both-only`);
          }
        }
        console.log(HDIV);

        let idx = 0;
        for (const [testName, tests] of grouped) {
          idx++;
          const isBoth = tests.length > 1;
          const file = tests[0].test_file ?? '';
          const suite = tests[0].test_suite ?? '';
          // badges line — file, suite, then per-mode: mode+duration+logcount, all inline
          const badges: string[] = [];
          if (file) badges.push(fileBadge(file));
          if (suite) badges.push(suiteBadge(suite));
          const logsPerTest: { test: TestRun; logs: TestLog[] }[] = [];
          for (const test of tests) {
            const logs = await db.getTestLogs(test.test_name, test.run_id);
            logsPerTest.push({ test, logs });
            const modeName = test.run_type === 'single-pool' ? 'pool' : test.run_type === 'single-threads' ? 'threads' : test.run_type;
            const dur = test.duration_ms != null ? formatElapsed(test.duration_ms) : '';
            badges.push(modeBadge(modeName, dur));
            if (logs.length > 0) badges.push(badge('📋', String(logs.length)));
          }
          if (isBoth) badges.push(bothTag());

          if (idx === 1) console.log(DIV);
          console.log(`  ${C.bold}${String(idx).padStart(2)}.${C.reset} ${C.brightWhite}${testName}${C.reset}`);
          console.log(`     ${badges.join(' ')}`);

          // extract reason: first error log message, or error_message from run
          let reason: string | null = null;
          for (const test of tests) {
            if (test.error_message) {
              reason = test.error_message.replace(/\n/g, ' ').substring(0, 150);
              break;
            }
          }
          if (!reason) {
            for (const { logs } of logsPerTest) {
              const errorLogs = logs.filter((l) => l.level === 'error');
              if (errorLogs.length > 0) {
                reason = errorLogs[0].message.replace(/\n/g, ' ').substring(0, 150);
                break;
              }
            }
          }
          if (reason) {
            console.log(`     ${C.dim}reason:${C.reset} ${C.yellow}${reason}${reason.length >= 150 ? '...' : ''}${C.reset}`);
          }

          // expanded logs only when --show-logs
          for (const { test, logs } of logsPerTest) {
            if (parsed.showLogs && logs.length > 0) {
              const modeName = test.run_type === 'single-pool' ? 'pool' : test.run_type === 'single-threads' ? 'threads' : test.run_type;
              console.log(`     ${C.dim}${modeName} logs:${C.reset}`);
              for (const log of logs) console.log(`       ${formatLog(log)}`);
            }
            const terminalDump = terminalDumps.get(test.test_id);
            if (terminalDump) {
              console.log(`     ${C.dim}terminal:${C.reset}`);
              console.log(formatTerminalDump(terminalDump));
            }
          }

          console.log(`  ${C.cyan}${seeLogsCommand(tests[0])}${C.reset}`);
          if (tests.length > 1) console.log(`  ${C.cyan}${seeLogsCommand(tests[1])}${C.reset}`);
          console.log(DIV);
        }

        return;
      }

      case 'logs': {
        const parsed = parseArgs(args);
        if (!parsed.testName) {
          console.error('Usage: logs <test-name> [--run-id ID] [--level ...] [--context ...] [--source ...] [--file ...] [--tags ...]');
          process.exitCode = 1;
          return;
        }
        const runId = parsed.runId ?? (await db.getLatestRunId(parsed.testName));
        if (!runId) {
          console.log(`No test found: ${parsed.testName}`);
          return;
        }
        const logs = await db.getTestLogs(parsed.testName, runId, {
          level: parsed.level,
          context: parsed.context,
          source: parsed.source,
          file: parsed.file,
          tags: parsed.tags,
        });
        if (logs.length === 0) {
          console.log(`No logs for: ${parsed.testName} (Run ID: ${runId})`);
          return;
        }
        console.log(`\n📋 ${logs.length} log(s) for ${parsed.testName} (Run ID: ${runId}):\n`);
        for (const log of logs) console.log(formatLog(log));
        const testRun = await db.getTestByName(parsed.testName, runId);
        if (testRun) console.log(formatCommandLine(seeLogsCommand(testRun)));
        return;
      }

      case 'errors': {
        const parsed = parseArgs(args);
        if (!parsed.testName) {
          console.error('Usage: errors <test-name> [--run-id ID] [--context ...] [--source ...]');
          process.exitCode = 1;
          return;
        }
        const runId = parsed.runId ?? (await db.getLatestRunId(parsed.testName));
        if (!runId) {
          console.log(`No test found: ${parsed.testName}`);
          return;
        }
        const logs = await db.getTestLogs(parsed.testName, runId, { level: 'error', context: parsed.context, source: parsed.source });
        if (logs.length === 0) {
          console.log(`No error logs for: ${parsed.testName} (Run ID: ${runId})`);
          return;
        }
        console.log(`\n🔴 ${logs.length} error log(s) for ${parsed.testName} (Run ID: ${runId}):\n`);
        for (const log of logs) console.log(formatLog(log));
        const testRun = await db.getTestByName(parsed.testName, runId);
        if (testRun) console.log(formatCommandLine(seeLogsCommand(testRun)));
        return;
      }

      case 'search': {
        const parsed = parseArgs(args);
        const query = args.find((a) => !a.startsWith('--'));
        if (!query) {
          console.error('Usage: search <query> [--test-name NAME] [--run-id ID]');
          process.exitCode = 1;
          return;
        }
        const logs = await db.searchLogs(query, parsed.testName, parsed.runId);
        if (logs.length === 0) {
          console.log(`No logs found matching "${query}"`);
          return;
        }
        console.log(`\n🔍 Found ${logs.length} log(s) matching "${query}":\n`);
        const byKey = new Map<string, { logs: TestLog[]; runId: string }>();
        for (const log of logs) {
          const key = `${log.test_name}:${log.run_id}`;
          if (!byKey.has(key)) byKey.set(key, { logs: [], runId: log.run_id });
          byKey.get(key)!.logs.push(log);
        }
        for (const [key, group] of byKey) {
          const testName = key.split(':')[0];
          console.log(`\n📋 ${testName} (${group.logs.length} log(s)):`);
          for (const log of group.logs) console.log(`  ${formatLog(log)}`);
          const testRun = await db.getTestByName(testName, group.runId);
          if (testRun) console.log(formatCommandLine(seeLogsCommand(testRun)));
          console.log('');
        }
        return;
      }

      case 'context': {
        const parsed = parseArgs(args);
        const query = args.find((a) => !a.startsWith('--'));
        if (!query) {
          console.error('Usage: context <context-query> [--test-name NAME] [--run-id ID]');
          process.exitCode = 1;
          return;
        }
        const logs = await db.searchLogsByContext(query, parsed.testName, parsed.runId);
        if (logs.length === 0) {
          console.log(`No logs found with context matching "${query}"`);
          return;
        }
        console.log(`\n🔍 Found ${logs.length} log(s) with context matching "${query}":\n`);
        const byKey = new Map<string, { logs: TestLog[]; runId: string }>();
        for (const log of logs) {
          const key = `${log.test_name}:${log.run_id}`;
          if (!byKey.has(key)) byKey.set(key, { logs: [], runId: log.run_id });
          byKey.get(key)!.logs.push(log);
        }
        for (const [key, group] of byKey) {
          const testName = key.split(':')[0];
          console.log(`\n📋 ${testName} (${group.logs.length} log(s)):`);
          for (const log of group.logs) console.log(`  ${formatLog(log)}`);
          const testRun = await db.getTestByName(testName, group.runId);
          if (testRun) console.log(formatCommandLine(seeLogsCommand(testRun)));
          console.log('');
        }
        return;
      }

      case 'test': {
        const parsed = parseArgs(args);
        if (!parsed.testName) {
          console.error('Usage: test <test-name> [--run-id ID] [--run-type single|full]');
          process.exitCode = 1;
          return;
        }
        const run = await db.getTestByName(parsed.testName, parsed.runId, parsed.runType);
        if (!run) {
          console.log(`No test found: ${parsed.testName}${parsed.runId ? ` (Run ID: ${parsed.runId})` : ''}`);
          return;
        }
        console.log(`\n📊 Test: ${parsed.testName}\n`);
        console.log(formatTestRun(run));
        const logs = await db.getTestLogs(parsed.testName, run.run_id);
        if (logs.length > 0) {
          console.log(`\n📋 Logs (${logs.length}):\n`);
          for (const log of logs) console.log(formatLog(log));
        } else console.log(`\n📋 No logs captured for this test.`);
        console.log(formatCommandLine(seeLogsCommand(run)));
        return;
      }

      case 'list': {
        const parsed = parseArgs(args);
        const tests = await db.getAllTestsForFile(parsed.testFile ?? 'unknown-test', parsed.runType);
        if (tests.length === 0) {
          console.log(`No tests found`);
          return;
        }
        const filters: string[] = [];
        if (parsed.testFile) filters.push(`file: ${parsed.testFile}`);
        if (parsed.runType) filters.push(`type: ${parsed.runType}`);
        console.log(`\n📋 ${tests.length} test(s)${filters.length ? ` (${filters.join(', ')})` : ''}:\n`);
        for (const test of tests) {
          const statusIcon =
            test.status === 'passed'
              ? '✅'
              : test.status === 'failed'
                ? '❌'
                : test.status === 'timeout'
                  ? '⏱️'
                  : test.status === 'unstable'
                    ? '⏭️'
                    : '❓';
          const suite = test.test_suite ? ` > ${test.test_suite}` : '';
          const file = test.test_file ? `${test.test_file} > ` : '';
          console.log(`${statusIcon} ${file}${test.test_name}${suite}`);
        }
        return;
      }

      case 'by-error': {
        const parsed = parseArgs(args);
        const errorCode = args.find((a) => !a.startsWith('--'));
        if (!errorCode) {
          console.error('Usage: by-error <error-code> [--run-id ID]');
          process.exitCode = 1;
          return;
        }
        const tests = await db.getTestsByErrorCode(errorCode, parsed.runId);
        if (tests.length === 0) {
          console.log(`No tests found with error code: ${errorCode}${parsed.runId ? ` (Run ID: ${parsed.runId})` : ''}`);
          return;
        }
        console.log(`\n🔴 ${tests.length} test(s) with error code ${errorCode}${parsed.runId ? ` (Run ID: ${parsed.runId})` : ''}:\n`);
        for (const test of tests) {
          console.log(formatTestRun(test));
          const logs = await db.getTestLogs(test.test_name, test.run_id);
          console.log(logs.length > 0 ? `   📋 ${logs.length} log(s) captured` : `   📋 No logs captured`);
          console.log(formatCommandLine(seeLogsCommand(test)));
          console.log('');
        }
        return;
      }

      case 'by-run': {
        const parsed = parseArgs(args);
        const runId = args[0]?.startsWith('--') ? parsed.runId : args[0];
        if (!runId) {
          console.error('Usage: by-run <run-id> [test-file] [--include-logs] [--errors-only]  (or set SHOW_LOGS=1)');
          process.exitCode = 1;
          return;
        }
        const testFile = parsed.testFile ?? parsed.file;
        const showLogs = args.includes('--show-logs') || args.includes('--include-logs') || process.env.SHOW_LOGS === '1' || process.env.SHOW_LOGS === 'true';
        const errorsOnly = args.includes('--errors-only') || process.env.ERRORS_ONLY === '1' || process.env.ERRORS_ONLY === 'true';
        const terminalDumps = showLogs ? new Map((await db.getTerminalDumpsByRunId(runId)).map((d) => [d.test_id, d.terminal_dump])) : new Map<string, string>();
        const tests = await db.getTestsByRunId(runId, testFile);
        if (tests.length === 0) {
          console.log(`No tests found for run ID: ${runId}${testFile ? ` (file: ${testFile})` : ''}`);
          console.log(`   Use the run ID from the same test-runner results file (e.g. unit-test-helper-results.txt).`);
          console.log(`   Ingest runs after tests; if you just ran tests, the run above should be in DuckDB.`);
          return;
        }
        console.log(`\n📊 ${tests.length} test(s) in run ${runId}${testFile ? ` (file: ${testFile})` : ''}${showLogs && errorsOnly ? ' (error-level logs only)' : ''}:\n`);
        let totalLogs = 0;
        for (const test of tests) {
          console.log(formatTestRun(test));
          if (showLogs) {
            const logs = await db.getTestLogs(test.test_name, runId, errorsOnly ? { level: 'error' } : undefined);
            totalLogs += logs.length;
            if (logs.length > 0) {
              console.log(`   📋 ${logs.length} log(s)${errorsOnly ? ' (errors only)' : ''}:\n`);
              for (const log of logs) console.log(`   ${formatLog(log)}`);
              console.log('');
            } else console.log(`   📋 No logs captured${errorsOnly ? ' (or no error-level logs)' : ''}\n`);
            const terminalDump = terminalDumps.get(test.test_id);
            if (terminalDump) {
              console.log(`   📺 Terminal output:\n`);
              console.log(formatTerminalDump(terminalDump));
              console.log('');
            }
          } else {
            const logs = await db.getTestLogs(test.test_name, runId);
            totalLogs += logs.length;
            console.log(logs.length > 0 ? `   📋 ${logs.length} log(s) captured` : `   📋 No logs captured`);
            console.log(formatCommandLine(seeLogsCommand(test)));
            console.log('');
          }
        }
        if (totalLogs === 0) {
          console.log(
            `💡 No logs for this run. Logs are captured when the log bridge is running during tests (global-setup starts it, or run \`npm run bridge\` in packages/logging-domain).\n`
          );
        }
        return;
      }

      case 'stats': {
        const parsed = parseArgs(args);
        const stats = await db.getTestStats(parsed.runId, parsed.runType, parsed.suiteType);
        const filters: string[] = [];
        if (parsed.runId) filters.push(`run: ${parsed.runId}`);
        if (parsed.runType) filters.push(`run-type: ${parsed.runType}`);
        if (parsed.suiteType) filters.push(`suite: ${parsed.suiteType}`);
        console.log(`\n📊 Test Statistics${filters.length ? ` (${filters.join(', ')})` : ''}:\n`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   ✅ Passed: ${stats.passed}`);
        console.log(`   ❌ Failed: ${stats.failed}`);
        console.log(`   ⏱️  Timeout: ${stats.timeout}`);
        console.log(`   ⚠️  Unstable: ${stats.unstable}`);
        if (stats.unknown > 0) console.log(`   ❓ Unknown: ${stats.unknown} (no test_result in NDJSON)`);
        if (Object.keys(stats.by_error_code).length > 0) {
          console.log(`\n   Error Codes:`);
          for (const [code, count] of Object.entries(stats.by_error_code)) console.log(`     ${code}: ${count}`);
        }
        return;
      }

      default:
        showUsage();
        process.exitCode = 1;
        return;
    }
  } finally {
    await db.close();
    const elapsed = Date.now() - startMs;
    process.stdout.write('\n⏱️  Time taken: ' + formatElapsed(elapsed) + '\n');
  }
}

run().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  const isFkConstraint =
    msg.includes('foreign key') && (msg.includes('still referenced') || msg.includes('DUCKDB_NODEJS_ERROR'));
  if (isFkConstraint) {
    const dbPath = getDefaultDbPath(parseDomain());
    console.error(err);
    console.error(`\nIf this DB was created before the FK fix, delete this file and re-run to get a fresh schema:\n  ${dbPath}\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
