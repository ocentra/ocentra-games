import { LogModule } from '@/constants/log-flags';
import { TestLogServerDefaultBaseUrl } from '@/constants/test-log-server';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import {
  RunType,
  type TestSuiteTypeValue,
  TestLogOrigin,
  asTestSuiteTypeOrNull,
} from '@ocentra/logging-domain/test-log/types';

export interface RequestContext {
  correlationId: string;
  testName?: string;
  runId?: string;
  runType?: RunType;
  testLogServerUrl?: string;
  userId?: string;
  startTime: number;
  debugModules: string[];
  suitePath?: string;
  suiteType?: TestSuiteTypeValue;
  origin?: TestLogOrigin;
}

function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function parseDebugModulesHeader(headerValue: string | null): string[] {
  if (!headerValue) return [];

  if (headerValue === 'true') {
    return [LogModule.Badges];
  }

  const modules: string[] = [];
  headerValue.split(',').forEach((m) => {
    const trimmed = m.trim();
    if (trimmed) {
      modules.push(trimmed);
    }
  });
  return modules;
}

const VALID_RUN_TYPES: RunType[] = [
  RunType.Single,
  RunType.Full,
  RunType.SinglePool,
  RunType.SingleThreads,
];

function parseRunType(value: string | null): RunType | undefined {
  if (!value || !VALID_RUN_TYPES.includes(value as RunType)) return undefined;
  return value as RunType;
}

export function createRequestContext(request: Request): RequestContext {
  const correlationId = request.headers.get(HttpHeader.XCorrelationId) || generateCorrelationId();
  const testNameHeader = request.headers.get(HttpHeader.XTestName);
  const runIdHeader = request.headers.get(HttpHeader.XRunId);
  const testLogServerUrlHeader = request.headers.get(HttpHeader.XTestLogServerUrl);
  const suitePathHeader = request.headers.get(HttpHeader.XSuitePath);
  const suiteTypeHeaderRaw = request.headers.get(HttpHeader.XSuiteType);
  const runTypeHeader = request.headers.get(HttpHeader.XRunType);

  const existingContext = getCurrentContext();
  const testName = testNameHeader || existingContext?.testName;
  const runId = runIdHeader || existingContext?.runId;
  const testLogServerUrl = testLogServerUrlHeader || existingContext?.testLogServerUrl || TestLogServerDefaultBaseUrl;
  const suitePath = suitePathHeader || existingContext?.suitePath;
  const suiteType =
    asTestSuiteTypeOrNull(suiteTypeHeaderRaw) ??
    asTestSuiteTypeOrNull(existingContext?.suiteType) ??
    undefined;
  const runType = parseRunType(runTypeHeader) ?? existingContext?.runType;

  const debugHeader =
    request.headers.get(HttpHeader.XDebugModules) || request.headers.get(HttpHeader.XEnableAbortDebug);
  const debugModules = parseDebugModulesHeader(debugHeader);

  const context: RequestContext = {
    correlationId,
    testName,
    runId,
    testLogServerUrl,
    startTime: Date.now(),
    debugModules,
    suitePath,
    suiteType,
    runType,
    origin: TestLogOrigin.Worker,
  };

  return context;
}

export function createMinimalContext(correlationId?: string): RequestContext {
  return {
    correlationId: correlationId || generateCorrelationId(),
    startTime: Date.now(),
    debugModules: [],
  };
}

let currentContext: RequestContext | null = null;

export function setCurrentContext(ctx: RequestContext | null): void {
  currentContext = ctx;
}

export function getCurrentContext(): RequestContext | null {
  return currentContext;
}

export function getElapsedTime(): number | undefined {
  return currentContext ? Date.now() - currentContext.startTime : undefined;
}

export function setContextUserId(userId: string): void {
  if (currentContext) {
    currentContext.userId = userId;
  }
}
