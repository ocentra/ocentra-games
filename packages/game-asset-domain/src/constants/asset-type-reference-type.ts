export const AssetTypeReferenceType = {
  Strategy: 'strategy',
  Scoring: 'scoring',
  Rules: 'rules',
  CardRanking: 'cardRanking',
} as const;

export type AssetTypeReferenceType = typeof AssetTypeReferenceType[keyof typeof AssetTypeReferenceType];
