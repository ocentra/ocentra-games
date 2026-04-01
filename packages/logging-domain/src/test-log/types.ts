export const NdjsonLineType = {
  Log: 'log',
  RunSummary: 'run_summary',
  TestResult: 'test_result',
} as const;

export type NdjsonLineType = (typeof NdjsonLineType)[keyof typeof NdjsonLineType];

export const RunType = {
  Single: 'single',
  Full: 'full',
  SinglePool: 'single-pool',
  SingleThreads: 'single-threads',
} as const;

export type RunType = (typeof RunType)[keyof typeof RunType];

export const TestSuiteTypeValue = {
  Unit: 'unit',
  Integration: 'integration',
  E2E: 'e2e',
  Websocket: 'websocket',
  Contract: 'contract',
} as const;

export type TestSuiteTypeValue = (typeof TestSuiteTypeValue)[keyof typeof TestSuiteTypeValue];

export const TestSuiteType = TestSuiteTypeValue;
export type TestSuiteType = TestSuiteTypeValue;

const VALID_SUITE_TYPES: readonly string[] = Object.values(TestSuiteTypeValue);

export function asTestSuiteType(value: string): TestSuiteType {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('TestSuiteType cannot be null, undefined, or empty string');
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_SUITE_TYPES.includes(normalized)) {
    throw new Error(
      `TestSuiteType must be one of: ${VALID_SUITE_TYPES.join(', ')}, got: "${value}"`
    );
  }
  return normalized as TestSuiteType;
}

export function asTestSuiteTypeOrNull(
  value: string | null | undefined
): TestSuiteType | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_SUITE_TYPES.includes(normalized) ? (normalized as TestSuiteType) : null;
}

export function isTestSuiteType(value: unknown): value is TestSuiteType {
  return typeof value === 'string' && VALID_SUITE_TYPES.includes(value);
}

export const SUITE_TYPE_META_KEY = 'ocentraSuiteType' as const;

export const LogRealm = {
  Cloudflare: 'cloudflare',
  Solana: 'solana',
  Main: 'main',
  Browser: 'browser',
  Vite: 'vite',
} as const;

export type LogRealm = (typeof LogRealm)[keyof typeof LogRealm];

export const LogEnvironment = {
  Test: 'test',
  Staging: 'staging',
  Prod: 'prod',
  Dev: 'dev',
} as const;

export type LogEnvironment = (typeof LogEnvironment)[keyof typeof LogEnvironment];

export const TestLogOrigin = {
  Test: 'test',
  Worker: 'worker',
} as const;

export type TestLogOrigin = (typeof TestLogOrigin)[keyof typeof TestLogOrigin];

const VALID_ORIGINS: readonly string[] = Object.values(TestLogOrigin);

export function asLogOrigin(value: string): TestLogOrigin {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('TestLogOrigin cannot be null, undefined, or empty string');
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_ORIGINS.includes(normalized)) {
    throw new Error(`TestLogOrigin must be 'test' or 'worker', got: "${value}"`);
  }
  return normalized as TestLogOrigin;
}

export function asLogOriginOrNull(
  value: string | null | undefined
): TestLogOrigin | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_ORIGINS.includes(normalized) ? (normalized as TestLogOrigin) : null;
}

export const IngestSource = {
  Ndjson: 'ndjson',
  Live: 'live',
} as const;

export type IngestSource = (typeof IngestSource)[keyof typeof IngestSource];

export interface TestRun {
  test_id: string;
  test_full_name: string;
  test_name: string;
  test_file: string;
  test_suite: string | null;
  run_id: string;
  run_type: RunType;
  run_timestamp: number;
  status: 'passed' | 'failed' | 'unstable' | 'timeout' | 'unknown';
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  error_stack: string | null;
  tags: string | null;
  realm: string | null;
  environment: string | null;
  ingest_source: IngestSource | null;
}

export interface TestLog {
  test_id: string;
  test_full_name: string;
  test_name: string;
  run_id: string;
  log_timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
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
  suite_type: TestSuiteTypeValue | null;
  origin: TestLogOrigin | null;
  realm: string | null;
  environment: string | null;
}

export interface NdjsonLogEntry {
  ts: string;
  runId: string;
  runType: string;
  suiteType: string;
  suitePath: string;
  testName: string;
  testId: string;
  cid: string | null;
  origin: string | null;
  lvl: string;
  log: string | null;
  fn: string | null;
  file: string | null;
  line: number | null;
  col: number | null;
  msg: string;
  data: string | null;
  tags: string | null;
  stack: string | null;
  realm: string | null;
  environment: string | null;
}
