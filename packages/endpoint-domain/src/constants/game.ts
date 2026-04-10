export const GameName = {
  Claim: 'CLAIM',
  Poker: 'Poker',
  WordSearch: 'WordSearch',
} as const;

export type GameNameType = (typeof GameName)[keyof typeof GameName];

export const GameTypeId = {
  Claim: 0,
  Poker: 1,
  WordSearch: 2,
} as const;

export const GameTypeIdValues = [
  GameTypeId.Claim,
  GameTypeId.Poker,
  GameTypeId.WordSearch,
] as const;

export const PlayerType = {
  Human: 'human',
  Ai: 'ai',
} as const;

export const PlayerTypeValues = [PlayerType.Human, PlayerType.Ai] as const;

export type PlayerTypeValue = (typeof PlayerType)[keyof typeof PlayerType];

export const DefaultGameType = {
  Hearts: 'hearts',
} as const;

export const FeedType = {
  Activity: 'activity',
} as const;

export const NotificationType = {
  Info: 'info',
  Retention: 'retention',
} as const;
