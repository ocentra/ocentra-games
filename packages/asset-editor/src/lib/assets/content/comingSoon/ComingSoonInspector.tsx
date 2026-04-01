import type { InspectorComponent } from '@/lib/core/inspector/types';
import { ImageListInspector } from '@/lib/assets/content/imageList/ImageListInspector';
import type { ComingSoon } from '@ocentra/game-asset-domain/content/comingSoon/ComingSoon';

export const ComingSoonInspector: InspectorComponent<ComingSoon | Record<string, unknown>> = (props) => {
  // Reuse ImageListInspector since ComingSoon has the same structure (images array)
  return ImageListInspector(props);
};
