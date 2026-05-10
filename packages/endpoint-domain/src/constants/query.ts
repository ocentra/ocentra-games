export const QueryParam = {
  Guid: 'guid',
  Hash: 'hash',
  Checksum: 'checksum',
  Type: 'type',
  Info: 'info',
  GameId: 'gameId',
  GameType: 'gameType',
  AssetPath: 'assetPath',
  Category: 'category',
  GameModeCategory: 'gameModeCategory',
  CopyFromGame: 'copyFromGame',
  Dir: 'dir',
  IncludeMeta: 'includeMeta',
  AssetType: 'assetType',
  Action: 'action',
  Guids: 'guids',
  Confirm: 'confirm',
  Token: 'token',
  Level: 'level',
  Source: 'source',
  Context: 'context',
  Since: 'since',
  Limit: 'limit',
  Offset: 'offset',
  Scope: 'scope',
  PaymentId: 'paymentId',
  StripeEventId: 'stripeEventId',
  Url: 'url',
  Search: 'q',
  Mode: 'mode',
  Visibility: 'visibility',
  RoomCode: 'roomCode',
} as const;

export type QueryParam = typeof QueryParam[keyof typeof QueryParam];

export const QueryValue = {
  True: 'true',
  False: 'false',
} as const;

export type QueryValue = typeof QueryValue[keyof typeof QueryValue];
