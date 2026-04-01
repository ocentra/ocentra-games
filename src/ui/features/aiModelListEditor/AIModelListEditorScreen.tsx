import { AIModelListEditorScreenWeb } from '@/ui/features/aiModelListEditor/AIModelListEditorScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const AIModelListEditorScreen = createPlatformScreen<Record<string, never>>(
  AIModelListEditorScreenWeb,
  () => import('@/ui/features/aiModelListEditor/AIModelListEditorScreen.desktop').then((m) => ({ default: m.AIModelListEditorScreenDesktop })),
  () => import('@/ui/features/aiModelListEditor/AIModelListEditorScreen.mobile').then((m) => ({ default: m.AIModelListEditorScreenMobile }))
);
