import { HttpMethod, HttpHeader, HttpAuthScheme } from '@ocentra/endpoint-domain/constants/http';
import { formatBearerToken } from '@/utils/auth';
import { consumeResponseBody } from '@/utils/consume-response-body';

export interface LogsAnalytics {
  writeDataPoint(data: {
    blobs: string[];
    doubles: number[];
    indexes: string[];
  }): void;
}

export interface LogsFetch {
  fetch(url: string, options: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<Response>;
}

export interface LogsKV {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}

export interface LogEntry {
  id?: string;
  level: string;
  message: string;
  timestamp: number;
  source?: string;
  context?: string;
  tags?: string[];
  data?: unknown;
  args?: unknown[];
  stack?: string;
  stackFrames?: unknown[];
  origin?: string;
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
}

export interface LogQuery {
  since?: string | number;
  limit?: number;
  level?: string;
  source?: string;
  context?: string;
  tags?: string[];
}

export interface LogStats {
  total_logs: number;
  by_level: Record<string, number>;
  by_source: Record<string, number>;
  by_context: Record<string, number>;
  oldest_timestamp: number | null;
  newest_timestamp: number | null;
}

export interface WriteLogInput {
  entry: LogEntry;
  maxLogSize: number;
  maxStackSize: number;
  maxArgsSize: number;
  maxBlobSize: number;
}

export interface WriteLogResult {
  success: boolean;
  error?: string;
}

export function writeLogToAnalyticsLogic(
  input: WriteLogInput,
  analytics: LogsAnalytics
): WriteLogResult {
  try {
    const isErrorOrWarn = input.entry.level === 'error' || input.entry.level === 'warn';

    let stack = input.entry.stack;
    let stackFrames = input.entry.stackFrames;

    if (!isErrorOrWarn) {
      stack = undefined;
      stackFrames = undefined;
    } else if (stack) {
      if (stack.length > input.maxStackSize) {
        stack = stack.substring(0, input.maxStackSize - 3) + '...';
      }
    }

    const truncateArgs = (args: unknown[] | undefined, maxSize: number): unknown[] | undefined => {
      if (!args || args.length === 0) return undefined;

      try {
        const jsonStr = JSON.stringify(args);
        if (jsonStr.length <= maxSize) return args;

        const truncated: unknown[] = [];
        let currentSize = 2;

        for (const arg of args) {
          const argJson = JSON.stringify(arg);
          if (currentSize + argJson.length + 1 > maxSize) {
            truncated.push('[TRUNCATED]');
            break;
          }
          truncated.push(arg);
          currentSize += argJson.length + 1;
        }

        return truncated.length > 0 ? truncated : undefined;
      } catch {
        return undefined;
      }
    };

    const truncatedArgs = truncateArgs(input.entry.args, input.maxArgsSize);

    const logEntry: {
      id: string;
      level: string;
      context: string;
      message: string;
      source: string;
      origin: string;
      timestamp: number;
      args?: unknown[];
      stack?: string;
      stackFrames?: unknown[];
      file?: string;
      filePath?: string;
      line?: number;
      column?: number;
    } = {
      id: input.entry.id || '',
      level: input.entry.level,
      context: input.entry.context || '',
      message: input.entry.message.substring(0, input.maxLogSize),
      source: input.entry.source || '',
      origin: input.entry.origin || '',
      timestamp: input.entry.timestamp,
      file: input.entry.file,
      filePath: input.entry.filePath,
      line: input.entry.line,
      column: input.entry.column,
    };

    if (truncatedArgs) {
      logEntry.args = truncatedArgs;
    }

    if (stack) {
      logEntry.stack = stack;
    }

    if (stackFrames) {
      logEntry.stackFrames = stackFrames;
    }

    let entryJson = JSON.stringify(logEntry);

    if (entryJson.length > input.maxBlobSize) {
      const ratio = input.maxBlobSize / entryJson.length;
      const newMessageSize = Math.floor(entryJson.length * ratio * 0.5);
      logEntry.message = logEntry.message.substring(0, Math.max(100, newMessageSize));

      if (logEntry.stack) {
        if (logEntry.stack.length > Math.floor(input.maxStackSize * ratio)) {
          logEntry.stack = logEntry.stack.substring(0, Math.floor(input.maxStackSize * ratio) - 3) + '...';
        }
      }

      if (logEntry.args) {
        logEntry.args = truncateArgs(logEntry.args, Math.floor(input.maxArgsSize * ratio));
      }

      entryJson = JSON.stringify(logEntry);

      if (entryJson.length > input.maxBlobSize) {
        logEntry.message = logEntry.message.substring(0, 100) + '[TRUNCATED]';
        logEntry.stack = undefined;
        logEntry.stackFrames = undefined;
        logEntry.args = undefined;
        entryJson = JSON.stringify(logEntry);
      }
    }

    analytics.writeDataPoint({
      blobs: [entryJson],
      doubles: [input.entry.timestamp, input.entry.line || 0, input.entry.column || 0],
      indexes: [`${input.entry.level}:${input.entry.source || ''}:${input.entry.origin || ''}`],
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export interface ParseSinceInput {
  since: string;
}

export interface ParseSinceResult {
  success: boolean;
  timestamp?: number | null;
  error?: string;
}

export function parseSinceLogic(input: ParseSinceInput): ParseSinceResult {
  if (!input.since) {
    return {
      success: false,
      error: 'Since parameter is required',
    };
  }

  const now = Date.now();
  const relativeMatch = input.since.match(/^(\d+)([hmsd])$/);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];

    let ms = 0;
    switch (unit) {
      case 's': ms = value * 1000; break;
      case 'm': ms = value * 60 * 1000; break;
      case 'h': ms = value * 60 * 60 * 1000; break;
      case 'd': ms = value * 24 * 60 * 60 * 1000; break;
    }
    return {
      success: true,
      timestamp: now - ms,
    };
  }

  try {
    const timestamp = new Date(input.since).getTime();
    if (isNaN(timestamp)) {
      return {
        success: false,
        error: 'Invalid timestamp format',
      };
    }
    return {
      success: true,
      timestamp,
    };
  } catch {
    return {
      success: false,
      error: 'Failed to parse timestamp',
    };
  }
}

export interface QueryLogsInput {
  query: LogQuery;
  accountId: string;
  apiToken: string;
  datasetName: string;
  analyticsEngineSqlUrl: (accountId: string) => string;
  parseSince: (since: string) => ParseSinceResult;
  defaultLimit: number;
  maxLimit: number;
}

export interface QueryLogsResult {
  success: boolean;
  logs?: LogEntry[];
  error?: string;
}

export async function queryLogsLogic(
  input: QueryLogsInput,
  fetchImpl: LogsFetch
): Promise<QueryLogsResult> {
  try {
    let sinceResult: ParseSinceResult;
    if (input.query.since === undefined || input.query.since === null) {
      sinceResult = { success: true, timestamp: null };
    } else if (typeof input.query.since === 'number') {
      sinceResult = { success: true, timestamp: input.query.since };
    } else {
      sinceResult = input.parseSince(input.query.since);
    }
    
    if (!sinceResult.success && sinceResult.error) {
      return {
        success: false,
        error: sinceResult.error,
      };
    }

    const sinceTimestamp = sinceResult.timestamp ?? null;
    const limit = Math.min(input.query.limit || input.defaultLimit, input.maxLimit);

    let sqlQuery = `SELECT blob1 as entry, double1, double1 as timestamp_value, timestamp FROM ${input.datasetName}`;
    const conditions: string[] = [];

    if (input.query.level) {
      const escapedLevel = input.query.level.replace(/'/g, "''");
      conditions.push(`startsWith(index1, '${escapedLevel}:')`);
    }
    if (input.query.source) {
      const escapedSource = input.query.source.replace(/'/g, "''");
      if (escapedSource.endsWith(':')) {
        conditions.push(`position(':${escapedSource}' IN index1) > 0`);
      } else {
        conditions.push(`position(':${escapedSource}:' IN index1) > 0`);
      }
    }
    if (sinceTimestamp !== null) {
      conditions.push(`double1 >= ${sinceTimestamp}`);
    }

    if (conditions.length > 0) {
      sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    sqlQuery += ` ORDER BY double1 DESC LIMIT ${limit}`;

    const response = await fetchImpl.fetch(
      input.analyticsEngineSqlUrl(input.accountId),
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: formatBearerToken(input.apiToken),
        },
        body: sqlQuery,
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `Analytics Engine query failed: ${response.status} - ${responseText}`,
      };
    }

    let result: {
      result?: Array<{ entry?: string; blob1?: string; timestamp_value?: number; double1?: number }>;
      data?: Array<{ entry?: string; blob1?: string; timestamp_value?: number; double1?: number }>;
      errors?: Array<{ message?: string }>;
    };

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse Analytics Engine response: ${String(parseError)}`,
      };
    }

    if (result.errors && result.errors.length > 0) {
      return {
        success: false,
        error: `Analytics Engine query error: ${result.errors.map(e => e.message || 'Unknown').join(', ')}`,
      };
    }

    const rows = result.data || result.result || [];

    if (rows.length === 0) {
      return {
        success: true,
        logs: [],
      };
    }

    const logs = rows
      .map((row) => {
        try {
          const entryJson = row.entry || row.blob1;
          if (entryJson) {
            return JSON.parse(entryJson) as LogEntry;
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null);

    return {
      success: true,
      logs,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export interface SanitizeErrorInput {
  error: unknown;
  safeMessages: readonly string[];
  separator: string;
  fallbackMessage: string;
  unknownError: string;
}

export interface SanitizeErrorResult {
  sanitized: string;
}

export function sanitizeErrorLogic(input: SanitizeErrorInput): SanitizeErrorResult {
  if (!input.error) {
    return { sanitized: input.unknownError };
  }

  const message = input.error instanceof Error ? input.error.message : String(input.error);

  for (const safeMsg of input.safeMessages) {
    if (message === safeMsg || message.startsWith(safeMsg + input.separator)) {
      return { sanitized: message };
    }
  }

  return { sanitized: input.fallbackMessage };
}

export interface TimingSafeEqualInput {
  a: string;
  b: string;
}

export interface TimingSafeEqualResult {
  equal: boolean;
}

export function timingSafeEqualLogic(input: TimingSafeEqualInput): TimingSafeEqualResult {
  const aLen = input.a.length;
  const bLen = input.b.length;
  const maxLen = Math.max(aLen, bLen);

  let result = aLen === bLen ? 0 : 1;

  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? input.a.charCodeAt(i) : 0;
    const bChar = i < bLen ? input.b.charCodeAt(i) : 0;
    result |= aChar ^ bChar;
  }

  return { equal: result === 0 };
}

export interface ValidateApiKeyInput {
  authHeader: string | null;
  expectedKey: string | undefined;
  bearerScheme: string;
  spaceSeparator: string;
}

export interface ValidateApiKeyResult {
  valid: boolean;
  error?: string;
}

export function validateApiKeyLogic(input: ValidateApiKeyInput): ValidateApiKeyResult {
  if (!input.authHeader) {
    return { valid: false, error: 'No Authorization header' };
  }

  const parts = input.authHeader.split(input.spaceSeparator);
  if (parts.length !== 2 || parts[0] !== input.bearerScheme) {
    return { valid: false, error: 'Invalid Authorization header format' };
  }

  if (!input.expectedKey) {
    return { valid: false, error: 'LOGS_API_KEY not configured' };
  }

  const providedKey = parts[1];
  const equalResult = timingSafeEqualLogic({ a: providedKey, b: input.expectedKey });

  return { valid: equalResult.equal };
}

export interface GetClientIdInput {
  cfConnectingIp: string | null;
  userAgent: string | null;
  unknownFallback: string;
  maxUserAgentLength: number;
}

export interface GetClientIdResult {
  clientId: string;
}

export function getClientIdLogic(input: GetClientIdInput): GetClientIdResult {
  const ip = input.cfConnectingIp || input.unknownFallback;
  const userAgent = (input.userAgent || input.unknownFallback).substring(0, input.maxUserAgentLength);
  return { clientId: `${ip}:${userAgent}` };
}

export interface GetStatsFromAnalyticsEngineInput {
  accountId: string;
  apiToken: string;
  datasetName: string;
  analyticsEngineSqlUrl: (accountId: string) => string;
  oneDayAgoMs: number;
  separator: string;
  fetchImpl: LogsFetch;
}

export interface GetStatsFromAnalyticsEngineResult {
  success: boolean;
  stats?: LogStats;
  error?: string;
}

export async function getStatsFromAnalyticsEngineLogic(
  input: GetStatsFromAnalyticsEngineInput
): Promise<GetStatsFromAnalyticsEngineResult> {
  try {
    const oneDayAgo = input.oneDayAgoMs;
    const totalQuery = `SELECT COUNT() as total FROM ${input.datasetName} WHERE double1 >= ${oneDayAgo}`;
    const totalResponse = await input.fetchImpl.fetch(
      input.analyticsEngineSqlUrl(input.accountId),
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${input.apiToken}`,
        },
        body: totalQuery,
      }
    );

    let total = 0;
    if (totalResponse.ok) {
      const totalResult = await totalResponse.json() as { data?: Array<{ total?: number | string }>; result?: Array<{ total?: number | string }>; errors?: Array<{ message?: string }> };
      if (totalResult.errors && totalResult.errors.length > 0) {
        return {
          success: false,
          error: `Stats query error: ${totalResult.errors.map(e => e.message || 'Unknown').join(', ')}`,
        };
      } else {
        const rows = totalResult.data || totalResult.result || [];
        total = Number(rows[0]?.total) || 0;
      }
    } else {
      await consumeResponseBody(totalResponse);
    }

    const byLevelQuery = `SELECT substring(index1, 1, position('${input.separator}' IN index1) - 1) as level, COUNT() as count FROM ${input.datasetName} WHERE double1 >= ${oneDayAgo} GROUP BY level`;
    const byLevelResponse = await input.fetchImpl.fetch(
      input.analyticsEngineSqlUrl(input.accountId),
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${input.apiToken}`,
        },
        body: byLevelQuery,
      }
    );

    const byLevel: Record<string, number> = {};
    if (byLevelResponse.ok) {
      const byLevelResult = await byLevelResponse.json() as { data?: Array<{ level?: string; count?: number | string }>; result?: Array<{ level?: string; count?: number | string }>; errors?: Array<{ message?: string }> };
      const rows = byLevelResult.data || byLevelResult.result || [];
      if (!byLevelResult.errors && rows.length > 0) {
        rows.forEach((row) => {
          if (row.level) {
            byLevel[row.level] = Number(row.count) || 0;
          }
        });
      }
    } else {
      await consumeResponseBody(byLevelResponse);
    }

    const bySourceQuery = `SELECT index1 as full_index, COUNT() as count FROM ${input.datasetName} WHERE double1 >= ${oneDayAgo} GROUP BY index1`;
    const bySourceResponse = await input.fetchImpl.fetch(
      input.analyticsEngineSqlUrl(input.accountId),
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${input.apiToken}`,
        },
        body: bySourceQuery,
      }
    );

    const bySource: Record<string, number> = {};
    if (bySourceResponse.ok) {
      const bySourceResult = await bySourceResponse.json() as { data?: Array<{ full_index?: string; count?: number | string }>; result?: Array<{ full_index?: string; count?: number | string }>; errors?: Array<{ message?: string }> };
      const rows = bySourceResult.data || bySourceResult.result || [];
      if (!bySourceResult.errors && rows.length > 0) {
        rows.forEach((row) => {
          if (row.full_index) {
            const parts = row.full_index.split(input.separator);
            if (parts.length >= 3) {
              const source = parts.slice(1, -1).join(input.separator);
              if (source) {
                bySource[source] = (bySource[source] || 0) + (Number(row.count) || 0);
              }
            }
          }
        });
      }
    } else {
      await consumeResponseBody(bySourceResponse);
    }

    const timeQuery = `SELECT MIN(double1) as oldest, MAX(double1) as newest FROM ${input.datasetName} WHERE double1 >= ${oneDayAgo}`;
    const timeResponse = await input.fetchImpl.fetch(
      input.analyticsEngineSqlUrl(input.accountId),
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${input.apiToken}`,
        },
        body: timeQuery,
      }
    );

    let oldest: number | null = null;
    let newest: number | null = null;
    if (timeResponse.ok) {
      const timeResult = await timeResponse.json() as { data?: Array<{ oldest?: number | string; newest?: number | string }>; result?: Array<{ oldest?: number | string; newest?: number | string }>; errors?: Array<{ message?: string }> };
      const rows = timeResult.data || timeResult.result || [];
      if (!timeResult.errors && rows.length > 0) {
        const oldestVal = rows[0]?.oldest;
        const newestVal = rows[0]?.newest;
        oldest = oldestVal ? Number(oldestVal) : null;
        newest = newestVal ? Number(newestVal) : null;
      }
    } else {
      await consumeResponseBody(timeResponse);
    }

    return {
      success: true,
      stats: {
        total_logs: total,
        by_level: byLevel,
        by_source: bySource,
        by_context: {},
        oldest_timestamp: oldest,
        newest_timestamp: newest,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
