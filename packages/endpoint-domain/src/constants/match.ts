import { IdempotencyKeyPattern, IdempotencyKeyLimits } from './idempotency';
import { ErrorMessage } from './errors';
import { Schema } from '@ocentra/schema-domain/effect';

export const MatchIdSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.filter((value) => value.trim().length > 0 || ErrorMessage.MatchIdCannotBeEmpty),
  Schema.filter((value) => value === value.trim() || ErrorMessage.MatchIdCannotHaveWhitespace),
  Schema.filter((value) => value.length === IdempotencyKeyLimits.UuidV4Length || `${ErrorMessage.MatchIdMustBeExactLength} ${IdempotencyKeyLimits.UuidV4Length}${ErrorMessage.MatchIdCharactersUuidV4Format}`),
  Schema.filter((value) => IdempotencyKeyPattern.UuidV4.test(value) || ErrorMessage.MatchIdMustBeValidUuidV4),
  Schema.brand('MatchId'),
);
export type MatchId = typeof MatchIdSchema.Type;
export const decodeMatchId = Schema.decodeUnknownSync(MatchIdSchema);

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

  return decodeMatchId(trimmed);
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
