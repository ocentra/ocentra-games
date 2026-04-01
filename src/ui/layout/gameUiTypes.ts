import type { PlayerUIConfig, SerializablePlayerUIKey } from '@/ui/components/GameScreen/CardGameScreen/PlayerUI';
import type { SeatPosition, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { GameAssetGameplay, GameAssetMetadata } from './tableLayoutTypes';

type SerializableOverrideMap = Partial<Record<SerializablePlayerUIKey, number>>;

export type SerializedSeatLayout = SerializableOverrideMap & {
  id: number;
  label?: string;
  position: SeatPosition;
  rotation: number;
  scale?: number;
};

export interface SerializedLayoutPreset {
  table?: TableShapeSettings;
  seats?: SerializedSeatLayout[];
}

export interface SerializedGameAsset {
  metadata?: Partial<GameAssetMetadata>;
  layout?: {
    defaultPlayerCount?: number;
    presets?: Record<string, SerializedLayoutPreset>;
    playerUiDefaults?: Partial<PlayerUIConfig>;
    views?: Record<string, SerializedLayoutPreset>;
  };
  gameplay?: GameAssetGameplay;
  extensions?: Record<string, unknown>;
}

