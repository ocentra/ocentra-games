import type {
  PlayerHubPageContentData,
} from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgContent';
import type {
  PlayerHubPageSvgControls,
} from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgSurfaceControls';

export const PLAYER_HUB_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:player-hub-page-layout-controls';

export type PlayerHubPageLayoutControlsMessage =
  | { type: 'request-state' }
  | {
      type: 'state';
      controls: PlayerHubPageSvgControls;
      content?: PlayerHubPageContentData;
    }
  | {
      type: 'update';
      controls: PlayerHubPageSvgControls;
      content?: PlayerHubPageContentData;
    };
