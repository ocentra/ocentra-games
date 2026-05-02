import { Schema } from '@ocentra/schema-domain/effect';

export const RunInSchema = Schema.String.pipe(
  Schema.filter((value) => ['pool', 'unstable'].includes(value.trim().toLowerCase()) || 'RunIn must be pool or unstable'),
  Schema.transform(Schema.String, {
    decode: (value) => value.trim().toLowerCase(),
    encode: (value) => value,
  }),
  Schema.brand('RunIn'),
);
export type RunIn = typeof RunInSchema.Type;
export const decodeRunIn = Schema.decodeUnknownSync(RunInSchema);

export const RunIn = {
  Pool: decodeRunIn('pool'),
  Unstable: decodeRunIn('unstable'),
} as const;

export type RunInValue = (typeof RunIn)[keyof typeof RunIn];

const VALID_RUN_IN: readonly string[] = [RunIn.Pool, RunIn.Unstable];

export function asRunIn(value: string): RunIn {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('RunIn cannot be null, undefined, or empty string');
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_RUN_IN.includes(normalized)) {
    throw new Error(
      `RunIn must be one of: ${VALID_RUN_IN.join(', ')}, got: "${value}"`
    );
  }
  return decodeRunIn(normalized);
}

export function asRunInOrNull(value: string | null | undefined): RunIn | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_RUN_IN.includes(normalized) ? decodeRunIn(normalized) : null;
}
