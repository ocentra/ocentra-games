export const AssetTypeCategory = {
  Game: 'Game',
  Content: 'Content',
  UI: 'UI',
  AI: 'AI',
} as const;

export type AssetCategory = (typeof AssetTypeCategory)[keyof typeof AssetTypeCategory];
