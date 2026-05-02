import { Schema } from '@ocentra/schema-domain/effect';

export const TestRunModeSchema = Schema.String.pipe(
  Schema.filter((value) => ['pool', 'unstable', 'production'].includes(value.trim().toLowerCase()) || 'TestRunMode must be pool, unstable, or production'),
  Schema.transform(Schema.String, {
    decode: (value) => value.trim().toLowerCase(),
    encode: (value) => value,
  }),
  Schema.brand('TestRunMode'),
);
export type TestRunMode = typeof TestRunModeSchema.Type;
export const decodeTestRunMode = Schema.decodeUnknownSync(TestRunModeSchema);

export const TestRunMode = {
  Pool: decodeTestRunMode('pool'),
  Unstable: decodeTestRunMode('unstable'),
  Production: decodeTestRunMode('production'),
} as const;

export type TestRunModeValue = (typeof TestRunMode)[keyof typeof TestRunMode];

const VALID_MODES: readonly string[] = [
  TestRunMode.Pool,
  TestRunMode.Unstable,
  TestRunMode.Production,
];

export function asTestRunMode(value: string): TestRunMode {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('TestRunMode cannot be null, undefined, or empty string');
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_MODES.includes(normalized)) {
    throw new Error(
      `TestRunMode must be one of: ${VALID_MODES.join(', ')}, got: "${value}"`
    );
  }
  return decodeTestRunMode(normalized);
}

export function asTestRunModeOrNull(
  value: string | null | undefined
): TestRunMode | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_MODES.includes(normalized) ? decodeTestRunMode(normalized) : null;
}
