export const AssetContentSlicePath = {
  EntryIndex: 'index/entry.json',
  Home: 'index/home.json',
  Games: 'games.json',
  gamePage(gameId: string): string {
    return `games/${gameId}/page.json`;
  },
  gameEngine(gameId: string): string {
    return `games/${gameId}/engine.json`;
  },
} as const;

