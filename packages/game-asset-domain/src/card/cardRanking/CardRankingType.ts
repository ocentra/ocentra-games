export const CardRankingType = {
  Default: 'StandardCardRanking',
  Standard: 'StandardCardRanking',
  Custom: 'Custom',
} as const;

export type CardRankingType = typeof CardRankingType[keyof typeof CardRankingType];
