export const AssetContentSlicePath = {
  EntryIndex: 'index/entry.json',
  Home: 'index/home.json',
  Games: 'games.json',
  CatalogIndex: 'catalog/index.json',
  gamePage(gameId: string): string {
    return `games/${gameId}/page.json`;
  },
  gameEngine(gameId: string): string {
    return `games/${gameId}/engine.json`;
  },
  catalogGame(slug: string): string {
    return `catalog/games/${slug}.json`;
  },
} as const;

