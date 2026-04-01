export const ValidationPattern = {
  GameId: /^[a-z][a-z0-9_]*$/,
  AssetName: /^[a-zA-Z0-9_][a-zA-Z0-9_ -]*$/,
  GameModePath: /GameMode\/[^/]+\/([^/]+)/,
} as const;
