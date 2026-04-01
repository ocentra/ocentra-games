import { DevPanelScreenWeb } from '@/ui/features/devPanel/DevPanelScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const DevPanelScreen = createPlatformScreen<Record<string, never>>(
  DevPanelScreenWeb,
  () => import('@/ui/features/devPanel/DevPanelScreen.desktop').then((m) => ({ default: m.DevPanelScreenDesktop })),
  () => import('@/ui/features/devPanel/DevPanelScreen.mobile').then((m) => ({ default: m.DevPanelScreenMobile }))
);
