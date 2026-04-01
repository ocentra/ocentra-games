export const EXPLORER_GAME_ID_PREFIX = 'explorer';

export function buildExplorerGameId(slug: string): string {
  return `${EXPLORER_GAME_ID_PREFIX}:${slug}`;
}

export function isExplorerGameId(gameId: string): boolean {
  return typeof gameId === 'string' && gameId.startsWith(`${EXPLORER_GAME_ID_PREFIX}:`);
}

export function getExplorerSlugFromGameId(gameId: string): string | null {
  if (!isExplorerGameId(gameId)) return null;
  return gameId.slice(EXPLORER_GAME_ID_PREFIX.length + 1);
}
