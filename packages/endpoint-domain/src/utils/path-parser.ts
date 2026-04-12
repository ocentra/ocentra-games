import { PathValidator } from '@/validators/path-validators';
import type { MatchId } from '@/constants/match';
import { validateMatchId } from '@/constants/match';
import { TournamentIdSchema } from '@/schemas/common';
import { LeadingSlashPattern, ParamName, PathSeparator } from '@/constants/paths';
import { ErrorMessage } from '@/constants/errors';
import { ValidationPattern } from '@/constants/validation-patterns';

function extractRawPathFromUrl(urlString: string): string {
  const pathMatch = urlString.match(ValidationPattern.UrlPathFromFull);
  if (pathMatch?.[1]) return pathMatch[1];
  const pathOnlyMatch = urlString.match(ValidationPattern.UrlPathOnly);
  if (pathOnlyMatch?.[1]) return pathOnlyMatch[1];
  return urlString;
}

export function extractIdFromPath(path: string, endpoint: string): string | null {
  if (!path.startsWith(endpoint)) return null;
  const remaining = path.slice(endpoint.length);
  const cleaned = remaining.replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash)[0];
  if (!cleaned || cleaned.length === 0) return null;
  try {
    return decodeURIComponent(cleaned);
  } catch {
    return cleaned;
  }
}

export function extractAndValidateIdFromPath(path: string, endpoint: string, paramName: string, rawUrlString?: string): { id: string | null; error: string | null } {
  if (!path.startsWith(endpoint)) {
    return { id: null, error: `${paramName}${ErrorMessage.ParamRequiredSuffix}` };
  }
  const remaining = path.slice(endpoint.length);
  const cleaned = remaining.replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash)[0];
  if (!cleaned || cleaned.length === 0) {
    return { id: null, error: `${paramName}${ErrorMessage.ParamRequiredSuffix}` };
  }
  let rawCleaned = cleaned;
  if (rawUrlString) {
    try {
      const rawPath = extractRawPathFromUrl(rawUrlString);
      if (rawPath.startsWith(endpoint)) {
        const rawCleanedCandidate = rawPath.slice(endpoint.length).replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash)[0];
        if (rawCleanedCandidate) rawCleaned = rawCleanedCandidate;
      }
    } catch {
      void 0;
    }
  }
  const rawValidation = PathValidator.validate(rawCleaned, paramName);
  if (!rawValidation.valid) {
    return { id: null, error: rawValidation.error || `${ErrorMessage.InvalidParamPrefix}${paramName}` };
  }
  try {
    const decoded = decodeURIComponent(cleaned);
    const decodedValidation = PathValidator.validate(decoded, paramName);
    if (!decodedValidation.valid) {
      return { id: null, error: decodedValidation.error || `${ErrorMessage.InvalidParamPrefix}${paramName}` };
    }
    const normalized = decodedValidation.normalized || decoded;
    if (paramName === ParamName.MatchId) {
      const matchValidation = validateMatchId(normalized);
      if (!matchValidation.valid || !matchValidation.matchId) {
        return { id: null, error: matchValidation.error || ErrorMessage.InvalidMatchIdFormatPath };
      }
      return { id: matchValidation.matchId, error: null };
    }
    if (paramName === ParamName.TournamentId) {
      const tournamentValidation = TournamentIdSchema.safeParse(normalized);
      if (!tournamentValidation.success) {
        return { id: null, error: `${paramName} ${ErrorMessage.PathParamContainsInvalidChars}` };
      }
      return { id: tournamentValidation.data, error: null };
    }
    return { id: normalized, error: null };
  } catch {
    if (paramName === ParamName.MatchId) {
      const matchValidation = validateMatchId(cleaned);
      if (!matchValidation.valid || !matchValidation.matchId) {
        return { id: null, error: matchValidation.error || ErrorMessage.InvalidMatchIdFormatPath };
      }
      return { id: matchValidation.matchId, error: null };
    }
    if (paramName === ParamName.TournamentId) {
      const tournamentValidation = TournamentIdSchema.safeParse(cleaned);
      if (!tournamentValidation.success) {
        return { id: null, error: `${paramName} ${ErrorMessage.PathParamContainsInvalidChars}` };
      }
      return { id: tournamentValidation.data, error: null };
    }
    return { id: cleaned, error: null };
  }
}

export function extractAndValidateMatchIdFromPath(path: string, endpoint: string, rawUrlString?: string): { matchId: MatchId | null; error: string | null } {
  const result = extractAndValidateIdFromPath(path, endpoint, ParamName.MatchId, rawUrlString);
  if (result.error || !result.id) {
    return { matchId: null, error: result.error || ErrorMessage.MatchIdRequired };
  }
  const matchValidation = validateMatchId(result.id);
  if (!matchValidation.valid || !matchValidation.matchId) {
    return { matchId: null, error: matchValidation.error || ErrorMessage.InvalidMatchIdFormat };
  }
  return { matchId: matchValidation.matchId, error: null };
}

export function extractIdAfterEndpoint(path: string, endpoint: string, subPath?: string): string | null {
  if (!path.startsWith(endpoint)) return null;
  let remaining = path.slice(endpoint.length);
  if (subPath && remaining.includes(subPath)) {
    remaining = remaining.replace(subPath, '');
  }
  const cleaned = remaining.replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash)[0];
  if (!cleaned || cleaned.length === 0) return null;
  try {
    return decodeURIComponent(cleaned);
  } catch {
    return cleaned;
  }
}

export function extractAndValidateIdAfterEndpoint(path: string, endpoint: string, paramName: string, subPath?: string, rawUrlString?: string): { id: string | null; error: string | null } {
  if (!path.startsWith(endpoint)) {
    return { id: null, error: `${paramName}${ErrorMessage.ParamRequiredSuffix}` };
  }
  let remaining = path.slice(endpoint.length);
  if (subPath && remaining.includes(subPath)) {
    remaining = remaining.replace(subPath, '');
  }
  const cleaned = remaining.replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash)[0];
  if (!cleaned || cleaned.length === 0) {
    return { id: null, error: `${paramName}${ErrorMessage.ParamRequiredSuffix}` };
  }
  let rawCleaned = cleaned;
  if (rawUrlString) {
    try {
      const rawPath = extractRawPathFromUrl(rawUrlString);
      if (rawPath.startsWith(endpoint)) {
        let rawRemaining = rawPath.slice(endpoint.length);
        if (subPath) {
          const subPathIndex = rawRemaining.indexOf(subPath);
          if (subPathIndex !== -1) rawRemaining = rawRemaining.substring(0, subPathIndex);
        }
        const rawCleanedCandidate = rawRemaining.replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash)[0];
        if (rawCleanedCandidate) rawCleaned = rawCleanedCandidate;
      }
    } catch {
      void 0;
    }
  }
  const rawValidation = PathValidator.validate(rawCleaned, paramName);
  if (!rawValidation.valid) {
    return { id: null, error: rawValidation.error || `${ErrorMessage.InvalidParamPrefix}${paramName}` };
  }
  try {
    const decoded = decodeURIComponent(cleaned);
    const decodedValidation = PathValidator.validate(decoded, paramName);
    if (!decodedValidation.valid) {
      return { id: null, error: decodedValidation.error || `${ErrorMessage.InvalidParamPrefix}${paramName}` };
    }
    return { id: decodedValidation.normalized || decoded, error: null };
  } catch {
    return { id: cleaned, error: null };
  }
}

export function extractPathAfterEndpoint(path: string, endpoint: string): string {
  if (!path.startsWith(endpoint)) return '';
  return path.slice(endpoint.length).replace(LeadingSlashPattern, '');
}

export function extractPathAfterId(path: string, endpoint: string, id: string): string {
  const idPath = `${endpoint}/${id}`;
  if (!path.startsWith(idPath)) return '';
  return path.slice(idPath.length).replace(LeadingSlashPattern, '');
}

export function extractPathParts(path: string, endpoint: string): string[] {
  if (!path.startsWith(endpoint)) return [];
  return path.slice(endpoint.length).replace(LeadingSlashPattern, '').split(PathSeparator.ForwardSlash).filter(part => part.length > 0);
}
