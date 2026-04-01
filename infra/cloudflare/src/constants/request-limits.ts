export const RequestLimits = {
  MaxRequestSizeBytes: 10 * 1024 * 1024,
} as const;

export type RequestLimits = typeof RequestLimits[keyof typeof RequestLimits];
