export const GameModeStatus = {
  WorkInProgress: 'WorkInProgress',
  InternalOnly: 'InternalOnly',
  Available: 'Available',
  ComingSoon: 'ComingSoon',
  Maintenance: 'Maintenance',
  Deprecated: 'Deprecated',
} as const;

export type GameModeStatus = typeof GameModeStatus[keyof typeof GameModeStatus];
