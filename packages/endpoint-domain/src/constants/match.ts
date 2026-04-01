import { IdempotencyKeyPattern, IdempotencyKeyLimits } from './idempotency';
import { ErrorMessage } from './errors';

export type MatchId = string & { readonly __brand: 'MatchId' };

export function asMatchId(value: string): MatchId {
  if (!value || typeof value !== 'string') {
    throw new Error(ErrorMessage.MatchIdCannotBeNull);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(ErrorMessage.MatchIdCannotBeEmpty);
  }

  if (trimmed !== value) {
    throw new Error(ErrorMessage.MatchIdCannotHaveWhitespace);
  }

  if (trimmed.length !== IdempotencyKeyLimits.UuidV4Length) {
    throw new Error(`${ErrorMessage.MatchIdMustBeExactLength} ${IdempotencyKeyLimits.UuidV4Length}${ErrorMessage.MatchIdCharactersUuidV4Format}`);
  }

  if (!IdempotencyKeyPattern.UuidV4.test(trimmed)) {
    throw new Error(ErrorMessage.MatchIdMustBeValidUuidV4);
  }

  return trimmed as MatchId;
}

export function validateMatchId(value: string): { valid: boolean; matchId?: MatchId; error?: string } {
  try {
    const matchId = asMatchId(value);
    return { valid: true, matchId };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : ErrorMessage.InvalidMatchIdFormat
    };
  }
}
