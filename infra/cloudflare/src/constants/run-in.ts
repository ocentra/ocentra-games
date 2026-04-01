export type RunIn = string & { readonly __brand: 'RunIn' };

export const RunIn = {
  Pool: 'pool' as RunIn,
  Unstable: 'unstable' as RunIn,
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
  return normalized as RunIn;
}

export function asRunInOrNull(value: string | null | undefined): RunIn | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_RUN_IN.includes(normalized) ? (normalized as RunIn) : null;
}
