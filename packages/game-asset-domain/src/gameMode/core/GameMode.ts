/// <reference types="vite/client" />
import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { PlayerAction } from '@ocentra/game-domain/types/game';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { GameRules } from '@/game/gameRules/GameRules';
import { Strategy } from '@/game/strategy/Strategy';
import { Scoring } from '@/game/scoring/Scoring';
import { ImageCarousel } from '@/content/imageCarousel/ImageCarousel';
import { GameModeStatus } from '@/constants/game-mode-status';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { GameInfo } from '@/game/gameInfo/GameInfo';
import { Layout } from '@/ui/layout/Layout';
import { GameMechanics } from '@/game/gameMechanics/GameMechanics';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { GameHome } from '@/schemas/game-home-schema';
import type { GamePage } from '@/schemas/game-page-schema';
import type { GameEngine } from '@/schemas/game-engine-schema';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';

@serializableClass({
  assetType: 'GameMode',
  displayName: 'Game Mode',
  category: AssetTypeCategory.Game,
})
export abstract class GameMode extends ScriptableObject {

  static override schemaVersion = 1;

  @serializable({ label: 'Release Status', group: 'Status' })
  releaseStatus: GameModeStatus = GameModeStatus.Available;

  @serializable({ label: 'Banner Image', group: 'Display' })
  bannerImage: ImageHash = '' as ImageHash;

  @serializable({ label: 'Game Icon', group: 'Display' })
  gameIcon: ImageHash = '' as ImageHash;

  abstract gameRulesAsset?: AssetResourceEntry<GameRules>;
  abstract strategyAsset?: AssetResourceEntry<Strategy>;
  abstract gameInfoAsset?: AssetResourceEntry<GameInfo>;
  abstract layoutAsset?: AssetResourceEntry<Layout>;
  abstract scoringAsset?: AssetResourceEntry<Scoring>;
  abstract carouselImagesAsset?: AssetResourceEntry<ImageCarousel>;
  abstract mechanicsAsset?: AssetResourceEntry<GameMechanics>;
  protected abstract onInitialize(): void;
  protected abstract InitializeGameConfiguration(): void;
  abstract minPlayers: number;
  abstract maxPlayers: number;
  abstract minHumanPlayers: number;
  abstract maxHumanPlayers: number;
  abstract supportsAI: boolean;
  abstract aiCountsAsPlayer: boolean;
  abstract gameModeCategory: string;
  protected abstract getGameId(): string;
  abstract isValidMove(action: PlayerAction, gameState: Record<string, unknown>): boolean;
  abstract getHome(): Promise<GameHome>;
  abstract getPage(): Promise<GamePage>;
  abstract getEngine(): GameEngine;
}
