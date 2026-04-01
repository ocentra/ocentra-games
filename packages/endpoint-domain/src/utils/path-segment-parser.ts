import type { MatchId } from '@/constants/match';
import { validateMatchId } from '@/constants/match';

export interface ParsedPath {
  segments: string[];
  matchId?: MatchId;
  action?: string;
  isValid: boolean;
  error?: string;
}

export function parsePathSegments(path: string): ParsedPath {
  if (!path || typeof path !== 'string') {
    return { segments: [], isValid: false, error: 'Path must be a non-empty string' };
  }
  const normalized = path.trim();
  if (!normalized.startsWith('/')) {
    return { segments: [], isValid: false, error: 'Path must start with /' };
  }
  const segments = normalized.split('/').filter(segment => segment.length > 0);
  return { segments, isValid: true };
}

export function parseMatchDOPath(path: string): { matchId: MatchId | null; action: string | null; error: string | null } {
  const parsed = parsePathSegments(path);
  if (!parsed.isValid) {
    return { matchId: null, action: null, error: parsed.error || 'Invalid path format' };
  }
  if (parsed.segments.length < 2) {
    return { matchId: null, action: null, error: `Expected at least 2 path segments (match/<matchId>/<action>), got ${parsed.segments.length}` };
  }
  const allSegments = path.trim().split('/');
  if (allSegments.length < 3 || allSegments[2] === '') {
    return { matchId: null, action: null, error: 'Match ID cannot be empty' };
  }
  if (parsed.segments[0] !== 'match') {
    return { matchId: null, action: null, error: `Expected first segment to be 'match', got '${parsed.segments[0]}'` };
  }
  const matchIdRaw = parsed.segments[1];
  if (!matchIdRaw || matchIdRaw.length === 0) {
    return { matchId: null, action: null, error: 'Match ID cannot be empty' };
  }
  const matchIdValidation = validateMatchId(matchIdRaw);
  if (!matchIdValidation.valid || !matchIdValidation.matchId) {
    return { matchId: null, action: null, error: matchIdValidation.error || 'Invalid matchId format' };
  }
  return { matchId: matchIdValidation.matchId, action: parsed.segments.length > 2 ? parsed.segments[2] : null, error: null };
}
