import type {
  CardGameEditorOverlayVisibility,
  CardGameLayerVisibility,
  CardGameLayoutDocument,
  CardGameSurfaceMode,
  CardGameViewerPerspective,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { type IsolationComponentType } from './isolation-types';

export const CARD_GAME_LAYOUT_DRAFT_CHANNEL = 'ocentra-card-game-layout-draft';

export interface CardGameLayoutDraftMessage {
  assetPath?: string;
  document?: CardGameLayoutDocument;
  playerCount?: number;
  editorLayerVisibility?: CardGameLayerVisibility;
  editorOverlayVisibility?: CardGameEditorOverlayVisibility;
  draftSessionId?: string;
  sourceSurface?: CardGameSurfaceMode;
  viewerPerspective?: CardGameViewerPerspective;
  
  // For partial updates from isolation hub
  type?: 'FULL_SYNC' | 'ISOLATED_UPDATE';
  componentType?: IsolationComponentType;
  componentLabel?: string;
  config?: unknown;
}

export const ISOLATION_REQUEST_CHANNEL = 'ocentra-isolation-request';

export interface IsolationRequestMessage {
  type: IsolationComponentType;
  label: string;
  config: unknown;
  assetPath: string;
}
