export const SUPPORTED_DTYPES = [
  'fp32',
  'fp16',
  'q8',
  'q4',
  'q4f16',
  'int8',
  'uint8',
  'bnb4',
  'auto',
] as const;

export type SupportedDtype = (typeof SUPPORTED_DTYPES)[number];

export const DEFAULT_BROWSER_LOCAL_DTYPE = 'fp32' as const;
