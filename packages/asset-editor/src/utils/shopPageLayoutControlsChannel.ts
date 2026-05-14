import type { ShopPageSvgControls } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';

export const SHOP_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:shop-page-layout-controls';

export type ShopPageLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: ShopPageSvgControls }
  | { type: 'update'; controls: ShopPageSvgControls };
