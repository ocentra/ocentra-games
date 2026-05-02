import type {
  FeaturedGameShowcasePreviewLayoutMode,
  FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types'

export const FEATURED_SHOWCASE_CONTROLS_CHANNEL = 'ocentra-featured-showcase-controls'

export type FeaturedShowcaseControlsMessage =
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
