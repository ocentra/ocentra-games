import { PlayerType } from '../constants/game';
import { ValidationPattern } from '../constants/validation-patterns';

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}


export function validateMatchRecord(data: unknown): { valid: boolean; error?: string } {
  if (!isPlainRecord(data)) {
    return { valid: false, error: 'Match record must be an object' };
  }

  const record = data as Record<string, unknown>;
  const semanticVersionPattern = ValidationPattern.SemanticVersion;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const allowedTopLevelKeys = [
    'match_id',
    'version',
    'schema_version',
    'game_type',
    'created_at',
    'ended_at',
    'players',
    'events',
    'metadata',
    'moves',
    'final_state',
    'started_at',
  ] as const;

  if (!hasOnlyKeys(record, allowedTopLevelKeys)) {
    return { valid: false, error: 'Match record contains unexpected fields' };
  }

  if (typeof record.match_id !== 'string' || !uuidPattern.test(record.match_id)) {
    return { valid: false, error: 'Match record must have match_id as a valid UUID' };
  }

  if (typeof record.version !== 'string' || !semanticVersionPattern.test(record.version)) {
    return { valid: false, error: 'Match record must have version as semantic version (e.g., "1.0.0")' };
  }

  if ('schema_version' in record && record.schema_version !== undefined) {
    if (typeof record.schema_version !== 'string' || !semanticVersionPattern.test(record.schema_version)) {
      return { valid: false, error: 'schema_version must be semantic version (e.g., "1.0.0") if present' };
    }
  }

  if ('game_type' in record && record.game_type !== undefined) {
    if (!isInteger(record.game_type)) {
      return { valid: false, error: 'game_type must be an integer if present' };
    }
  }

  if ('created_at' in record && record.created_at !== undefined && !isValidDateTimeString(record.created_at)) {
    return { valid: false, error: 'created_at must be a valid date-time string' };
  }

  if ('ended_at' in record && record.ended_at !== undefined && !isValidDateTimeString(record.ended_at)) {
    return { valid: false, error: 'ended_at must be a valid date-time string' };
  }

  if ('started_at' in record && record.started_at !== undefined && !isValidDateTimeString(record.started_at)) {
    return { valid: false, error: 'started_at must be a valid date-time string' };
  }

  if (!Array.isArray(record.events)) {
    return { valid: false, error: 'Match record must have events array' };
  }

  for (const event of record.events) {
    if (!isPlainRecord(event)) {
      return { valid: false, error: 'Events array items must be objects' };
    }
    if (!hasOnlyKeys(event, ['type', 'timestamp'])) {
      return { valid: false, error: 'Event objects contain unexpected fields' };
    }
    if (typeof event.type !== 'string') {
      return { valid: false, error: 'Event type must be a string' };
    }
    if (!isValidDateTimeString(event.timestamp)) {
      return { valid: false, error: 'Event timestamp must be a valid date-time string' };
    }
  }

  if ('players' in record && record.players !== undefined && record.players !== null && !Array.isArray(record.players)) {
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
      if (!hasOnlyKeys(player, ['player_id', 'display_name', 'rating', 'wallet_address', 'player_type', 'score'])) {
        return { valid: false, error: 'Player objects contain unexpected fields' };
      }
      if (typeof player.player_id !== 'string') {
        return { valid: false, error: 'Player player_id must be a string' };
      }
      if (typeof player.display_name !== 'string') {
        return { valid: false, error: 'Player display_name must be a string' };
      }
      if (!isFiniteNumber(player.rating)) {
        return { valid: false, error: 'Player rating must be a finite number' };
      }
      if (!isFiniteNumber(player.score)) {
        return { valid: false, error: 'Player score must be a finite number' };
      }
      if (typeof player.player_type !== 'string' || !Object.values(PlayerType).includes(player.player_type as typeof PlayerType[keyof typeof PlayerType])) {
        return { valid: false, error: 'Player player_type must be human or ai' };
      }
      if ('wallet_address' in player && player.wallet_address !== undefined && typeof player.wallet_address !== 'string') {
        return { valid: false, error: 'Player wallet_address must be a string if present' };
      }
    }
  }

  if ('moves' in record && record.moves !== undefined && record.moves !== null && !Array.isArray(record.moves)) {
    return { valid: false, error: 'Moves field must be an array if present' };
  }

  if (record.moves === null) {
    return { valid: false, error: 'Moves field cannot be null' };
  }

  if (Array.isArray(record.moves)) {
    for (const move of record.moves) {
      if (!isPlainRecord(move)) {
        return { valid: false, error: 'Move items must be objects' };
      }
      if (!hasOnlyKeys(move, ['turn', 'player_id', 'move', 'timestamp', 'metadata'])) {
        return { valid: false, error: 'Move objects contain unexpected fields' };
      }
      if (!isInteger(move.turn)) {
        return { valid: false, error: 'Move turn must be an integer' };
      }
      if (typeof move.player_id !== 'string') {
        return { valid: false, error: 'Move player_id must be a string' };
      }
      if (typeof move.move !== 'string') {
        return { valid: false, error: 'Move move must be a string' };
      }
      if (!isValidDateTimeString(move.timestamp)) {
        return { valid: false, error: 'Move timestamp must be a valid date-time string' };
      }
      if ('metadata' in move && move.metadata !== undefined && !isPlainRecord(move.metadata)) {
        return { valid: false, error: 'Move metadata must be an object if present' };
      }
    }
  }

  if ('metadata' in record && record.metadata !== undefined && !isPlainRecord(record.metadata)) {
    return { valid: false, error: 'metadata must be an object if present' };
  }

  if ('final_state' in record && record.final_state !== undefined) {
    if (!isPlainRecord(record.final_state)) {
      return { valid: false, error: 'final_state must be an object if present' };
    }
    if (!hasOnlyKeys(record.final_state, ['phase', 'current_turn', 'current_player', 'board_state', 'winner'])) {
      return { valid: false, error: 'final_state contains unexpected fields' };
    }
    if ('phase' in record.final_state && record.final_state.phase !== undefined) {
      if (typeof record.final_state.phase !== 'string' || !['waiting', 'active', 'completed', 'finalized'].includes(record.final_state.phase)) {
        return { valid: false, error: 'final_state.phase must be one of waiting, active, completed, finalized' };
      }
    }
    if ('current_turn' in record.final_state && record.final_state.current_turn !== undefined) {
      if (!isInteger(record.final_state.current_turn)) {
        return { valid: false, error: 'final_state.current_turn must be an integer' };
      }
    }
    if ('current_player' in record.final_state && record.final_state.current_player !== undefined) {
      if (typeof record.final_state.current_player !== 'string') {
        return { valid: false, error: 'final_state.current_player must be a string' };
      }
    }
    if ('board_state' in record.final_state && record.final_state.board_state !== undefined) {
      if (!isPlainRecord(record.final_state.board_state)) {
        return { valid: false, error: 'final_state.board_state must be an object' };
      }
      if (!hasOnlyKeys(record.final_state.board_state, ['fen'])) {
        return { valid: false, error: 'final_state.board_state contains unexpected fields' };
      }
      if ('fen' in record.final_state.board_state && record.final_state.board_state.fen !== undefined) {
        if (typeof record.final_state.board_state.fen !== 'string') {
          return { valid: false, error: 'final_state.board_state.fen must be a string' };
        }
      }
    }
    if ('winner' in record.final_state && record.final_state.winner !== undefined) {
      if (typeof record.final_state.winner !== 'string') {
        return { valid: false, error: 'final_state.winner must be a string' };
      }
    }
  }

  return { valid: true };
}
