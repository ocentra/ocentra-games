import type { ShopPageSvgControls } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import type { ShopPageContentData } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';

export const SHOP_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:shop-page-layout-controls';

export type ShopPageLayoutControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; controls: ShopPageSvgControls; content?: ShopPageContentData }
  | { type: 'update'; controls: ShopPageSvgControls; content?: ShopPageContentData };
