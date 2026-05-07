import type {
  SelectedGameContentPlan,
  SelectedGameLayoutControls,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';

export type SelectedGamePreviewLayoutMode = 'auto' | 'wide' | 'narrow';

export const SELECTED_GAME_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:selected-game-layout-controls';

export type SelectedGameLayoutControlsMessage =
  | { type: 'request-state' }
  | {
      type: 'state';
      layoutControls: SelectedGameLayoutControls;
      contentPlan: SelectedGameContentPlan;
      previewSampleGameId: string;
      previewLayoutMode: SelectedGamePreviewLayoutMode;
      debugBounds: boolean;
    }
  | {
      type: 'update';
      layoutControls: SelectedGameLayoutControls;
      contentPlan: SelectedGameContentPlan;
      previewSampleGameId: string;
      debugBounds: boolean;
    }
  | {
      type: 'preview-layout-mode';
      previewLayoutMode: SelectedGamePreviewLayoutMode;
    };
