import { useCallback, useMemo } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import type { AvatarInfo } from '@ocentra/core-ui/types/avatarInfo';
import type { UnifiedHeaderConfigInput } from '@ocentra/core-ui/Header/UnifiedHeader.config';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { isGuestIdentity } from '@/lib/auth/guestIdentity';
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';

interface UseHeaderRightAuthConfigOptions {
  user: UserProfile | null;
  onLogout?: () => void;
  onUpgradeGuestClick?: () => void;
  onAdminDashboardClick?: () => void;
  onViewProfileClick?: () => void;
  onSettingsClick?: () => void;
  onSecurityClick?: () => void;
  onUpdatePhoto?: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars?: () => Promise<AvatarInfo[]>;
}

export function useHeaderRightAuthConfig({
  user,
  onLogout,
  onUpgradeGuestClick,
  onAdminDashboardClick,
  onViewProfileClick,
  onSettingsClick,
  onSecurityClick,
  onUpdatePhoto,
  getAvatars,
}: UseHeaderRightAuthConfigOptions): UnifiedHeaderConfigInput['right'] {
  const { requireSession, requireAccount } = useAuthAccess();

  const handleLoginClick = useCallback(() => {
    void requireSession();
  }, [requireSession]);

  const handleUpgradeGuestClick = useCallback(() => {
    if (onUpgradeGuestClick) {
      onUpgradeGuestClick();
      return;
    }
    void requireAccount();
  }, [onUpgradeGuestClick, requireAccount]);

  return useMemo(() => {
    if (!user) {
      return {
        text: 'Login',
        ariaLabel: 'Login',
        isButton: true,
        onClick: handleLoginClick,
      };
    }

    return {
      isProfile: true,
      user: {
        uid: user.uid,
        name: user.displayName || 'Player',
        email: user.email,
        avatarUrl: getHeaderAvatarUrl(user.photoURL),
        isLoggedIn: true,
        isGuest: isGuestIdentity(user),
        isAdmin: user.isAdmin,
        eloRating: user.eloRating,
        gamesPlayed: user.gamesPlayed,
        winRate: user.winRate,
      },
      onLogout,
      onUpgradeGuestClick: handleUpgradeGuestClick,
      onAdminDashboardClick,
      onViewProfileClick,
      onSettingsClick,
      onSecurityClick,
      onUpdatePhoto,
      getAvatars,
    };
  }, [getAvatars, handleLoginClick, handleUpgradeGuestClick, onAdminDashboardClick, onLogout, onSecurityClick, onSettingsClick, onUpdatePhoto, onViewProfileClick, user]);
}
