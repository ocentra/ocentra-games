import { SettingsScreenWeb } from '@/ui/features/settings/SettingsScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const SettingsScreen = createPlatformScreen<Record<string, never>>(
  SettingsScreenWeb,
  () => import('@/ui/features/settings/SettingsScreen.desktop').then((m) => ({ default: m.SettingsScreenDesktop })),
  () => import('@/ui/features/settings/SettingsScreen.mobile').then((m) => ({ default: m.SettingsScreenMobile }))
);
