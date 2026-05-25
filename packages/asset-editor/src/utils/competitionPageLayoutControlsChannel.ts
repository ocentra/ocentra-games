import type { CompetitionProgramsResponse } from '@ocentra/endpoint-domain/schemas/competition';
import type { ShopPageContentData } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
import type { ShopPageSvgControls } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';

export const COMPETITION_PAGE_LAYOUT_CONTROLS_CHANNEL =
  'ocentra:competition-page-layout-controls';

export type CompetitionPageLayoutControlsMessage =
  | { type: 'request-state' }
  | {
      type: 'state';
      controls: ShopPageSvgControls;
      content?: ShopPageContentData;
      programs?: CompetitionProgramsResponse;
    }
  | {
      type: 'update';
      controls: ShopPageSvgControls;
      content?: ShopPageContentData;
      programs?: CompetitionProgramsResponse;
    };
