import {
  IdempotencyKeyLimits,
  IdempotencyKeyPattern,
  IdempotencyKeyFormat,
  IdempotencyKeyPrefix,
  type IdempotencyKey,
  asIdempotencyKey,
} from '@/constants/idempotency';
import { PathSeparator, RandomString } from '@/constants/paths';
import { ErrorMessage } from '@/constants/errors';

export interface IdempotencyKeyValidationResult {
  valid: boolean;
  error?: string;
  format?: IdempotencyKeyFormat;
}

export function validateIdempotencyKey(key: string | null | undefined): IdempotencyKeyValidationResult {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: ErrorMessage.IdempotencyKeyMustBeNonEmptyString };
  }
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: ErrorMessage.IdempotencyKeyCannotBeEmptyOrWhitespace };
  }
  if (trimmed.length < IdempotencyKeyLimits.MinLength) {
    return { valid: false, error: `${ErrorMessage.IdempotencyKeyMinLength} ${IdempotencyKeyLimits.MinLength} character(s)` };
  }
  if (trimmed.length > IdempotencyKeyLimits.MaxLength) {
    return { valid: false, error: `${ErrorMessage.IdempotencyKeyMaxLength} ${IdempotencyKeyLimits.MaxLength} characters` };
  }
  if (!IdempotencyKeyPattern.AllowedCharacters.test(trimmed)) {
    return { valid: false, error: ErrorMessage.IdempotencyKeyAllowedCharacters };
  }
  const isUuidV4 = IdempotencyKeyPattern.UuidV4.test(trimmed);
  if (isUuidV4) return { valid: true, format: IdempotencyKeyFormat.UuidV4 };
  if (trimmed.length < IdempotencyKeyLimits.CustomMinLength) {
    return { valid: false, error: `${ErrorMessage.IdempotencyKeyCustomMinLength} ${IdempotencyKeyLimits.CustomMinLength} characters` };
  }
  return { valid: true, format: IdempotencyKeyFormat.Custom };
}

export function validateAndExtractIdempotencyKey(
  key: string | null | undefined
): { valid: false; error: string } | { valid: true; key: IdempotencyKey } {
  if (key && typeof key === 'string' && key !== key.trim()) {
    return { valid: false, error: ErrorMessage.IdempotencyKeyNoLeadingTrailingWhitespace };
  }
  const validation = validateIdempotencyKey(key);
  if (!validation.valid) {
    return { valid: false, error: validation.error || ErrorMessage.InvalidIdempotencyKeyFormat };
  }
  return { valid: true, key: asIdempotencyKey(key!) };
}

export function generateIdempotencyKey(prefix: IdempotencyKeyPrefix): IdempotencyKey {
  const timestamp = Date.now().toString();
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return asIdempotencyKey(`${prefix}${timestamp}${PathSeparator.Dash}${uuid}`);
}

export function generateRollbackIdempotencyKey(transactionId: string): IdempotencyKey {
  if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0) {
    throw new Error(ErrorMessage.TransactionIdCannotBeNull);
  }
  const sanitized = transactionId.replace(/[^A-Za-z0-9_-]/g, '_').trim();
  if (sanitized.length === 0) throw new Error(ErrorMessage.TransactionIdCannotBeEmptyAfterSanitization);
  const prefixLength = IdempotencyKeyPrefix.Rollback.length;
  const maxLen = IdempotencyKeyLimits.MaxLength - prefixLength;
  const minLen = IdempotencyKeyLimits.CustomMinLength - prefixLength;
  let final = sanitized.length > maxLen ? sanitized.substring(0, maxLen) : sanitized;
  if (final.length < minLen) {
    const pad = Math.random().toString(RandomString.Radix).substring(RandomString.StartIndex, RandomString.StartIndex + Math.min(minLen - final.length, RandomString.Length));
    final = `${final}${PathSeparator.Dash}${pad}`.substring(0, maxLen);
  }
  const key = `${IdempotencyKeyPrefix.Rollback}${final}`;
  if (key.length < IdempotencyKeyLimits.CustomMinLength) {
    const pad = Math.random().toString(RandomString.Radix).substring(RandomString.StartIndex, RandomString.StartIndex + IdempotencyKeyLimits.CustomMinLength - key.length);
    return asIdempotencyKey(`${key}${PathSeparator.Dash}${pad}`.substring(0, IdempotencyKeyLimits.MaxLength));
  }
  return asIdempotencyKey(key);
}
