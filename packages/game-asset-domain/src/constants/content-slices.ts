export const AssetContentSlicePath = {
  EntryIndex: 'index/entry.json',
  Home: 'index/home.json',
  Games: 'games.json',
  AppPage(pageId: string): string {
    return `pages/${pageId}.json`;
  },
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

export const AppPageSliceId = {
  Shop: 'shop',
  Social: 'social',
  Games: 'card-games-explorer',
  Tournaments: 'competition',
  Leaderboard: 'competition-leaderboard',
  Profile: 'player-hub',
  Admin: 'admin',
} as const;

export type AppPageSliceId = (typeof AppPageSliceId)[keyof typeof AppPageSliceId];
