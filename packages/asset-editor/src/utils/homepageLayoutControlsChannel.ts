import type { HomepageLayoutControlsData } from '@ocentra/game-asset-domain/schemas/home-page-games-schema'

export const HOMEPAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra-homepage-layout-controls'

export type HomepageLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: HomepageLayoutControlsData }
  | { type: 'update'; controls: HomepageLayoutControlsData }
