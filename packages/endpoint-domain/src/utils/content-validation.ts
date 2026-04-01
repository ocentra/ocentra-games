import { HashPrefix, IdentifierType } from '@/constants/resources';
import { PathTraversalLiteral, ValidationPattern } from '@/constants/validation-patterns';

export function normalizeGuid(guid: string): string {
  if (!guid || typeof guid !== 'string') return '';
  return guid
    .replace(ValidationPattern.InvisibleCharsGlobal, '')
    .replace(ValidationPattern.ControlCharsAndSpaceOneOrMore, '')
    .trim()
    .toLowerCase();
}

const stripSha256Prefix = (s: string): string =>
  s.startsWith(HashPrefix.Sha256) ? s.slice(HashPrefix.Sha256.length) : s;

export function normalizeHash(hash: string): string {
  if (!hash || typeof hash !== 'string') return '';
  const cleaned = hash
    .replace(ValidationPattern.InvisibleCharsGlobal, '')
    .replace(ValidationPattern.ControlCharsAndSpaceOneOrMore, '')
    .toLowerCase();
  return stripSha256Prefix(cleaned);
}

export function isValidGuid(guid: string): boolean {
  if (!guid || typeof guid !== 'string') return false;
  const normalized = normalizeGuid(guid);
  const cleaned = guid.replace(ValidationPattern.ControlCharsAndSpaceGlobal, '').trim().toLowerCase();
  if (normalized.length !== cleaned.length) return false;
  if (normalized.includes(PathTraversalLiteral.ForwardSlash) || normalized.includes(PathTraversalLiteral.Backslash) || normalized.includes(PathTraversalLiteral.ParentDir)) return false;
  return ValidationPattern.UuidV4.test(normalized);
}

export function isValidHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') return false;
  const normalized = normalizeHash(hash);
  const originalCleaned = stripSha256Prefix(hash.replace(ValidationPattern.ControlCharsAndSpaceGlobal, '').toLowerCase());
  if (normalized.length !== originalCleaned.length) return false;
  return ValidationPattern.HashHex64.test(normalized);
}

export type { IdentifierType } from '@/constants/resources';

export function detectIdentifierType(identifier: string): IdentifierType {
  if (!identifier || typeof identifier !== 'string') return IdentifierType.Unknown;
  if (isValidGuid(identifier)) return IdentifierType.Guid;
  if (isValidHash(identifier)) return IdentifierType.Hash;
  return IdentifierType.Unknown;
}
