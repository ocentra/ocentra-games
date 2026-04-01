import type { BuildProcessedGameOptions } from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';
import { buildCreateGameModeOptionsFromProcessedGame } from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';
import { createGameModeBundle, type GameModeBundle } from '@/adapters/assets/createGameModeBundle';

export interface CreateProcessedGameModeBundleOptions extends BuildProcessedGameOptions {}

export async function createProcessedGameModeBundle(options: CreateProcessedGameModeBundleOptions): Promise<GameModeBundle> {
  const createOptions = buildCreateGameModeOptionsFromProcessedGame({
    processedGamePath: options.processedGamePath,
    category: options.category,
  });
  return createGameModeBundle(createOptions);
}
