import type { LobbyPageSvgControls } from '@ocentra/core-ui/AppPages/Lobby/LobbyPageSvgSurfaceControls';

export const LOBBY_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:lobby-page-layout-controls';

export type LobbyPageLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: LobbyPageSvgControls }
  | { type: 'update'; controls: LobbyPageSvgControls };
