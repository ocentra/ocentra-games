import type { LeaderboardPageSvgControls } from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';
import type { LeaderboardPageContentData } from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgContent';

export const LEADERBOARD_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:leaderboard-page-layout-controls';

export type LeaderboardPageLayoutControlsMessage =
  | { type: 'request-state' }
  | {
      type: 'state';
      controls: LeaderboardPageSvgControls;
      content?: LeaderboardPageContentData;
    }
  | {
      type: 'update';
      controls: LeaderboardPageSvgControls;
      content?: LeaderboardPageContentData;
    };
