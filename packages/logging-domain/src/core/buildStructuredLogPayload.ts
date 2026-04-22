import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';
import type { StackFrame } from '@ocentra/logging-domain/types/stackFrame';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { RequestContext } from '@ocentra/logging-domain/core/requestContextProvider';
import type { RegistrationInfo } from '@ocentra/logging-domain/types/registrationInfo';
import type { StructuredLogPayload, LogOriginValue } from '@ocentra/logging-domain/types/structuredLogPayload';
import { LogOriginValue as LogOriginValueConst } from '@ocentra/logging-domain/types/structuredLogPayload';

function suitePathToSuite(suitePath: string | undefined): string | undefined {
  if (!suitePath) return undefined;
  const segment = suitePath.split(/[/\\]/).pop();
  return segment ?? undefined;
}

function originToSource(origin: string | undefined): LogOriginValue | undefined {
  if (!origin) return undefined;
  const lower = origin.toLowerCase();
  if (lower === 'test' || lower === LogOriginValueConst.Test) return LogOriginValueConst.Test;
  if (lower === 'worker' || lower === LogOriginValueConst.Worker) return LogOriginValueConst.Worker;
  return undefined;
}

function stackTraceToStringArray(stack: StackTrace | string | undefined): string[] | undefined {
  if (!stack) return undefined;
  const s = typeof stack === 'string' ? stack : String(stack);
  const lines = s
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

export function buildStructuredLogPayload(
  level: LogLevel,
  message: string,
  data: unknown | undefined,
  registeredUser: RegistrationInfo | null,
  primaryFrame: StackFrame | null,
  stackTrace: StackTrace | string | undefined,
  logSource: LogSource,
  context: string | undefined,
  ctx: RequestContext | null | undefined
): StructuredLogPayload {
  const timestamp = Date.now();
  const payload: StructuredLogPayload = {
    level: typeof level === 'string' ? level : 'info',
    message,
    runId: ctx?.runId,
    suite: suitePathToSuite(ctx?.suitePath),
    testName: ctx?.testName,
    worker: ctx?.worker,
    functionName: primaryFrame?.function,
    tags: ctx?.tags && ctx.tags.length > 0 ? [...ctx.tags] : undefined,
    stackTrace: stackTraceToStringArray(stackTrace),
    source: originToSource(ctx?.origin),
    correlationId: ctx?.correlationId,
    context,
    moduleSource: registeredUser?.className ?? logSource,
    data,
    file: primaryFrame?.file,
    filePath: primaryFrame?.filePath,
    line: primaryFrame?.line,
    column: primaryFrame?.column,
    timestamp,
    elapsed: ctx ? timestamp - ctx.startTime : undefined,
  };
  return payload;
}
