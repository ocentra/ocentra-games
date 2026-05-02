import type {
  FeaturedGameShowcasePreviewLayoutMode,
  FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types'

export const COMING_SOON_SHOWCASE_CONTROLS_CHANNEL =
  'ocentra-coming-soon-showcase-controls'

export type ComingSoonShowcaseControlsMessage =
  | { type: 'request-state' }
  | {
    type: 'state'
    controls: FeaturedShowcaseControls
    previewLayoutMode: FeaturedGameShowcasePreviewLayoutMode
  }
  | { type: 'update'; controls: FeaturedShowcaseControls }
  | {
    type: 'preview-layout-mode'
    previewLayoutMode: FeaturedGameShowcasePreviewLayoutMode
  }
