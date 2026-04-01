export function validateMatchRecord(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Match record must be an object' };
  }

  const record = data as Record<string, unknown>;

  if (!record.match_id && !record.matchId) {
    return { valid: false, error: 'Match record must have match_id or matchId' };
  }

  if (!record.version && !record.schema_version) {
    return { valid: false, error: 'Match record must have version or schema_version' };
  }

  const version = (record.version || record.schema_version) as string;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    return { valid: false, error: 'Version must be semantic version (e.g., "1.0.0")' };
  }

  if (!Array.isArray(record.events)) {
    return { valid: false, error: 'Match record must have events array' };
  }

  if (record.events.length > 10000) {
    return { valid: false, error: 'Events array too large (max 10000 events)' };
  }

  if (record.players !== undefined && record.players !== null && !Array.isArray(record.players)) {
    return { valid: false, error: 'Players field must be an array if present' };
  }

  if (record.players === null) {
    return { valid: false, error: 'Players field cannot be null' };
  }

  return { valid: true };
}
