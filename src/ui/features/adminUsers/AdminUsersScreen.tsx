import { AdminUsersScreenWeb } from '@/ui/features/adminUsers/AdminUsersScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const AdminUsersScreen = createPlatformScreen<Record<string, never>>(
  AdminUsersScreenWeb,
  () => import('@/ui/features/adminUsers/AdminUsersScreen.desktop').then((m) => ({ default: m.AdminUsersScreenDesktop })),
  () => import('@/ui/features/adminUsers/AdminUsersScreen.mobile').then((m) => ({ default: m.AdminUsersScreenMobile }))
);
