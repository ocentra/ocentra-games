export type TestRunMode = string & { readonly __brand: 'TestRunMode' };

export const TestRunMode = {
  Pool: 'pool' as TestRunMode,
  Unstable: 'unstable' as TestRunMode,
  Production: 'production' as TestRunMode,
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
  return normalized as TestRunMode;
}

export function asTestRunModeOrNull(
  value: string | null | undefined
): TestRunMode | null {
  if (value == null || typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_MODES.includes(normalized) ? (normalized as TestRunMode) : null;
}
