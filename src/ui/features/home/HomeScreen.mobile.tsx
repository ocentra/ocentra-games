import type { UserProfile } from '@/adapters/firebase/service';
import { HomeScreenShared } from '@/ui/features/home/HomeScreen.shared';

interface HomeScreenProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function HomeScreenMobile(props: HomeScreenProps) {
  return (
    <div data-platform-feature="home-mobile">
      <HomeScreenShared {...props} />
    </div>
  );
}
