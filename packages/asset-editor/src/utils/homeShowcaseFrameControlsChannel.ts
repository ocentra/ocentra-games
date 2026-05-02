import type {
  HomeShowcaseFrameControls,
  HomeShowcasePreviewLayoutMode,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types'

export type HomeShowcaseFrameControlsKind = 'about'

export const HOME_SHOWCASE_FRAME_CONTROLS_CHANNEL =
  'ocentra-home-showcase-frame-controls'

export type HomeShowcaseFrameControlsMessage =
  | { type: 'request-state'; kind: HomeShowcaseFrameControlsKind }
  | {
    type: 'state'
    kind: HomeShowcaseFrameControlsKind
    controls: HomeShowcaseFrameControls
    previewLayoutMode: HomeShowcasePreviewLayoutMode
  }
  | {
    type: 'update'
    kind: HomeShowcaseFrameControlsKind
    controls: HomeShowcaseFrameControls
  }
  | {
    type: 'preview-layout-mode'
    kind: HomeShowcaseFrameControlsKind
    previewLayoutMode: HomeShowcasePreviewLayoutMode
  }
