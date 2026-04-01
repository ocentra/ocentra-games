import { LogsScreenWeb } from '@/ui/features/logs/LogsScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const LogsScreen = createPlatformScreen<Record<string, never>>(
  LogsScreenWeb,
  () => import('@/ui/features/logs/LogsScreen.desktop').then((m) => ({ default: m.LogsScreenDesktop })),
  () => import('@/ui/features/logs/LogsScreen.mobile').then((m) => ({ default: m.LogsScreenMobile }))
);
