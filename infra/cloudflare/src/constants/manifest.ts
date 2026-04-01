export const ManifestErrorMessage = {
  InvalidHashFormatPrefix: 'Invalid hash format:',
} as const;

export type ManifestErrorMessage = (typeof ManifestErrorMessage)[keyof typeof ManifestErrorMessage];
