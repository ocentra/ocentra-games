import type { AuthPageSvgControls } from '@ocentra/core-ui/Auth/CyberAuthSurface';

export const AUTH_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:auth-page-layout-controls';

export type AuthPageLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: AuthPageSvgControls }
  | { type: 'update'; controls: AuthPageSvgControls };
