import type { LeaderboardPageSvgControls } from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';

export const LEADERBOARD_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:leaderboard-page-layout-controls';

export type LeaderboardPageLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: LeaderboardPageSvgControls }
  | { type: 'update'; controls: LeaderboardPageSvgControls };
