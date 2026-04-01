export const ApiVersion = {
  V1: 'v1',
} as const;

export const ApiPathPrefix = `/api/${ApiVersion.V1}` as const;

export type ApiVersionValue = typeof ApiVersion[keyof typeof ApiVersion];
