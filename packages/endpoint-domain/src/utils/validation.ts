import { MatchRecordSchema } from '../schemas/matches';
import { ValidationPattern } from '../constants/validation-patterns';

const MATCH_RECORD_EVENTS_MAX = 10000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMatchRecordInput(data: Record<string, unknown>): Record<string, unknown> {
  const matchId = typeof data.match_id === 'string' ? data.match_id : data.matchId;
  const version = typeof data.version === 'string' ? data.version : data.schema_version;
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : data.created_at;
  const endedAt = typeof data.endedAt === 'string' ? data.endedAt : data.ended_at;

  return {
    ...data,
    ...(typeof matchId === 'string' ? { match_id: matchId } : {}),
    ...(typeof version === 'string' ? { version } : {}),
    ...(typeof createdAt === 'string' ? { created_at: createdAt } : {}),
    ...(typeof endedAt === 'string' ? { ended_at: endedAt } : {}),
  };
}

export function validateMatchRecord(data: unknown): { valid: boolean; error?: string } {
  if (!isPlainObject(data)) {
    return {
      valid: false,
      error: 'Match record must be an object',
    };
  }

  const matchId = typeof data.match_id === 'string' ? data.match_id : data.matchId;
  if (typeof matchId !== 'string' || matchId.length === 0) {
    return {
      valid: false,
      error: 'Match record must have match_id or matchId',
    };
  }

  const version = typeof data.version === 'string' ? data.version : data.schema_version;
  if (typeof version !== 'string' || version.length === 0) {
    return {
      valid: false,
      error: 'Match record must have version or schema_version',
    };
  }

  if (!ValidationPattern.SemanticVersion.test(version)) {
    return {
      valid: false,
      error: 'Version must be semantic version (e.g., "1.0.0")',
    };
  }

  if (!Array.isArray(data.events)) {
    return {
      valid: false,
      error: 'Match record must have events array',
    };
  }

  if (data.events.length > MATCH_RECORD_EVENTS_MAX) {
    return {
      valid: false,
      error: `Events array too large (max ${MATCH_RECORD_EVENTS_MAX} events)`,
    };
  }

  const parsed = MatchRecordSchema.safeParse(normalizeMatchRecordInput(data));
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues[0]?.message || 'Invalid match record',
    };
  }

  return { valid: true };
}
