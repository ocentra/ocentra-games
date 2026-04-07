import { PlayerType } from '../constants/game';

function isValidDateTimeString(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const rfc3339Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  return rfc3339Pattern.test(trimmed) && !Number.isNaN(Date.parse(trimmed));
}

export function validateMatchRecord(data: unknown): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Match record must be an object' };
    }

    const record = data as Record<string, unknown>;
    const semanticVersionPattern = /^[0-9]+\.[0-9]+\.[0-9]+$/;

    const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
      typeof value === 'object' && value !== null && !Array.isArray(value)
    );

  if (!record.match_id && !record.matchId) {
    return { valid: false, error: 'Match record must have match_id or matchId' };
  }

    if (!record.version && !record.schema_version) {
      return { valid: false, error: 'Match record must have version or schema_version' };
    }

    const version = (record.version || record.schema_version) as string;
    if (typeof version !== 'string' || !semanticVersionPattern.test(version)) {
      return { valid: false, error: 'Version must be semantic version (e.g., "1.0.0")' };
    }

    if ('game_type' in record && record.game_type !== undefined) {
      if (typeof record.game_type !== 'number' || !Number.isInteger(record.game_type)) {
        return { valid: false, error: 'game_type must be an integer if present' };
      }
    }

    if ('metadata' in record && record.metadata !== undefined) {
      if (!isPlainRecord(record.metadata)) {
        return { valid: false, error: 'metadata must be an object if present' };
      }
    }

    if ('created_at' in record && record.created_at !== undefined && !isValidDateTimeString(record.created_at)) {
      return { valid: false, error: 'created_at must be a valid date-time string' };
    }

    if ('createdAt' in record && record.createdAt !== undefined && !isValidDateTimeString(record.createdAt)) {
      return { valid: false, error: 'createdAt must be a valid date-time string' };
    }

    if ('ended_at' in record && record.ended_at !== undefined && !isValidDateTimeString(record.ended_at)) {
      return { valid: false, error: 'ended_at must be a valid date-time string' };
    }

    if ('endedAt' in record && record.endedAt !== undefined && !isValidDateTimeString(record.endedAt)) {
      return { valid: false, error: 'endedAt must be a valid date-time string' };
    }

  if (!Array.isArray(record.events)) {
    return { valid: false, error: 'Match record must have events array' };
  }

    if (record.events.length > 10000) {
      return { valid: false, error: 'Events array too large (max 10000 events)' };
    }

    if (record.events.some((event) => !isPlainRecord(event))) {
      return { valid: false, error: 'Events array items must be objects' };
    }

    if (record.players !== undefined && record.players !== null && !Array.isArray(record.players)) {
      return { valid: false, error: 'Players field must be an array if present' };
    }

    if (record.players === null) {
      return { valid: false, error: 'Players field cannot be null' };
    }

    if (Array.isArray(record.players)) {
      for (const player of record.players) {
        if (!isPlainRecord(player)) {
          return { valid: false, error: 'Players array items must be objects' };
        }

        if ('player_id' in player && player.player_id !== undefined && typeof player.player_id !== 'string') {
          return { valid: false, error: 'Player player_id must be a string if present' };
        }

        if ('wallet_address' in player && player.wallet_address !== undefined && typeof player.wallet_address !== 'string') {
          return { valid: false, error: 'Player wallet_address must be a string if present' };
        }

        if ('player_type' in player && player.player_type !== undefined) {
          if (typeof player.player_type !== 'string' || !Object.values(PlayerType).includes(player.player_type as typeof PlayerType[keyof typeof PlayerType])) {
            return { valid: false, error: 'Player player_type must be human or ai if present' };
          }
        }

        if ('score' in player && player.score !== undefined) {
          if (typeof player.score !== 'number' || !Number.isFinite(player.score)) {
            return { valid: false, error: 'Player score must be a finite number if present' };
          }
        }
      }
    }

  return { valid: true };
}
