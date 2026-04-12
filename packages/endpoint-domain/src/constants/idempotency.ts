import { ErrorMessage } from '@/constants/errors';
import { ValidationPattern } from '@/constants/validation-patterns';

export const IdempotencyKeyFormat = {
  UuidV4: 'uuid-v4',
  Custom: 'custom',
} as const;

export type IdempotencyKeyFormat = typeof IdempotencyKeyFormat[keyof typeof IdempotencyKeyFormat];

export const IdempotencyKeyLimits = {
  MaxLength: 100,
  UuidV4Length: 36,
  CustomMinLength: 8,
  CustomMaxLength: 100,
} as const;

export type IdempotencyKeyLimits = typeof IdempotencyKeyLimits[keyof typeof IdempotencyKeyLimits];

export const IdempotencyKeyPattern = {
  AllowedCharacters: /^[A-Za-z0-9_-]+$/,
  UuidV4: ValidationPattern.UuidV4,
} as const;

export const IdempotencyKeyPrefix = {
  Earn: 'earn-',
  Purchase: 'purchase-',
  Consume: 'consume-',
  ConsumeAC: 'consume-ac-',
  Rollback: 'rollback-',
  BadgeReward: 'badge-',
} as const;

export type IdempotencyKeyPrefix = typeof IdempotencyKeyPrefix[keyof typeof IdempotencyKeyPrefix];

export const MetadataField = {
  IdempotencyKey: 'idempotencyKey',
  IdempotencyKeySnake: 'idempotency_key',
} as const;

export type MetadataField = typeof MetadataField[keyof typeof MetadataField];

export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

export function asIdempotencyKey(value: string): IdempotencyKey {
  if (!value || typeof value !== 'string') {
    throw new Error(ErrorMessage.IdempotencyKeyCannotBeNull);
  }

  if (value.trim().length === 0) {
    throw new Error(ErrorMessage.IdempotencyKeyCannotBeEmpty);
  }

  if (value !== value.trim()) {
    throw new Error(ErrorMessage.IdempotencyKeyCannotHaveWhitespace);
  }

  if (value.length > IdempotencyKeyLimits.MaxLength) {
    throw new Error(`${ErrorMessage.IdempotencyKeyMustNotExceed} ${IdempotencyKeyLimits.MaxLength}${ErrorMessage.CharacterUnit.Plural}`);
  }

  if (!IdempotencyKeyPattern.AllowedCharacters.test(value)) {
    throw new Error(ErrorMessage.IdempotencyKeyMustContainOnly);
  }

  const isUuidV4 = IdempotencyKeyPattern.UuidV4.test(value);
  if (!isUuidV4 && value.length < IdempotencyKeyLimits.CustomMinLength) {
    throw new Error(`${ErrorMessage.CustomIdempotencyKeyMinLength} ${IdempotencyKeyLimits.CustomMinLength}${ErrorMessage.CharacterUnit.Plural}`);
  }

  return value as IdempotencyKey;
}
