import type { SeatLayout, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { PlayerUIConfig } from '@/ui/components/GameScreen/CardGameScreen/PlayerUI';

export interface LayoutPreset {
  table: TableShapeSettings;
  seats: SeatLayout[];
}

export interface GameAssetMetadata {
  gameId: string;
  schemaVersion: number;
  displayName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameAssetLayout {
  defaultPlayerCount: number;
  presets: Record<string, LayoutPreset>;
  playerUiDefaults?: Partial<PlayerUIConfig>;
  views?: Record<string, LayoutPreset>;
}

export interface GameAssetGameplay {
  prompts?: unknown[];
  rules?: unknown;
  [key: string]: unknown;
}

export interface GameAsset {
  metadata: GameAssetMetadata;
  layout: GameAssetLayout;
  gameplay?: GameAssetGameplay;
  extensions?: Record<string, unknown>;
}

export interface TableLayoutState {
  playerCount: number;
  table: TableShapeSettings;
  seats: SeatLayout[];
  selectedSeatId: number | null;
  isEditorVisible: boolean;
  gameId: string | null;
  asset: GameAsset | null;
}

