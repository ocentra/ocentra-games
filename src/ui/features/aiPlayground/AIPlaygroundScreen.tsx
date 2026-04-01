import { AIPlaygroundScreenWeb } from '@/ui/features/aiPlayground/AIPlaygroundScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const AIPlaygroundScreen = createPlatformScreen<Record<string, never>>(
  AIPlaygroundScreenWeb,
  () => import('@/ui/features/aiPlayground/AIPlaygroundScreen.desktop').then((m) => ({ default: m.AIPlaygroundScreenDesktop })),
  () => import('@/ui/features/aiPlayground/AIPlaygroundScreen.mobile').then((m) => ({ default: m.AIPlaygroundScreenMobile }))
);
