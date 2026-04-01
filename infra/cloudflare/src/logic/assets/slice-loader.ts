import type { Env } from '@/constants/env';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';

export async function readSliceText(env: Env, r2Key: string): Promise<string | null> {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(r2Key);
  if (!object) return null;
  return object.text();
}

export function slicePathToR2Key(path: string): string | null {
  if (path === '/api/v1/slices/entry-index' || path.endsWith('/slices/entry-index')) {
    return AssetContentSlicePath.EntryIndex;
  }
  if (path === '/api/v1/slices/home' || path.endsWith('/slices/home')) {
    return AssetContentSlicePath.Home;
  }
  if (path === '/api/v1/slices/games' || path.endsWith('/slices/games')) {
    return AssetContentSlicePath.Games;
  }
  const gamePageMatch = path.match(/\/slices\/games\/([^/]+)\/page$/);
  if (gamePageMatch) {
    return AssetContentSlicePath.gamePage(decodeURIComponent(gamePageMatch[1]));
  }
  const gameEngineMatch = path.match(/\/slices\/games\/([^/]+)\/engine$/);
  if (gameEngineMatch) {
    return AssetContentSlicePath.gameEngine(decodeURIComponent(gameEngineMatch[1]));
  }
  return null;
}
