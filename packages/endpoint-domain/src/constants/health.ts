export const HealthStatus = {
  Ok: 'ok',
} as const;

export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];
