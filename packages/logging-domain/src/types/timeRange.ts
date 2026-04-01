export const TimeRange = {
  Minute1: '1m',
  Minutes5: '5m',
  Minutes15: '15m',
  Minutes30: '30m',
  Hour1: '1h',
  Hours2: '2h',
  Hours6: '6h',
  Hours24: '24h',
  Days7: '7d',
  Days30: '30d',
  Days90: '90d',
  Days365: '365d',
} as const;

export type TimeRange = typeof TimeRange[keyof typeof TimeRange];
