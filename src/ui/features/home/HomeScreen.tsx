import type { UserProfile } from '@/adapters/firebase/service';
import { HomeScreenWeb } from '@/ui/features/home/HomeScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

interface HomeScreenProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export const HomeScreen = createPlatformScreen<HomeScreenProps>(
  HomeScreenWeb,
  () => import('@/ui/features/home/HomeScreen.desktop').then((m) => ({ default: m.HomeScreenDesktop })),
  () => import('@/ui/features/home/HomeScreen.mobile').then((m) => ({ default: m.HomeScreenMobile }))
);
