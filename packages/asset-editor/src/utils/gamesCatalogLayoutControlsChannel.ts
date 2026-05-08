import type { GamesCatalogSvgLayoutControls } from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcaseControls'

export const GAMES_CATALOG_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:games-catalog-layout-controls'

export type GamesCatalogLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: GamesCatalogSvgLayoutControls }
  | { type: 'update'; controls: GamesCatalogSvgLayoutControls }
