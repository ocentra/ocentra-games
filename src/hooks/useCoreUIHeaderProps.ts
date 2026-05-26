import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { ROUTE_FEATURES, RouteFeature } from '@/config/platformFeatures';
import { buildPlayerHubPath } from '@/ui/navigation/appRoutes';
import { getProxiedImageUrl, shouldProxyImage } from '@utils/imageProxy';
import { AvatarAssetManager } from '@/lib/managers/resources/AvatarAssetManager';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';

export function useCoreUIHeaderProps() {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile } = useAuth();
  const { requireSession, requireAccount } = useAuthAccess();

  const getImageUrl = useCallback((url: string) => {
    return shouldProxyImage(url) ? getProxiedImageUrl(url) : url;
  }, []);

  const onUpdatePhoto = useCallback(
    (data: { photoURL: string }) => updateUserProfile(data),
    [updateUserProfile]
  );

  const getAvatars = useCallback(async () => {
    const list = await AvatarAssetManager.getInstance().getAvatars();
    return list.map((a) => ({ id: a.id, name: a.name, url: a.url }));
  }, []);

  const onLogin = useCallback(() => {
    void requireSession();
  }, [requireSession]);

  const onUpgradeGuest = useCallback(() => {
    void requireAccount();
  }, [requireAccount]);

  const rightConfig = useHeaderRightAuthConfig({
    user,
    onLogout: logout,
    onUpgradeGuestClick: onUpgradeGuest,
    onAdminDashboardClick: () => navigate(ROUTE_FEATURES[RouteFeature.Admin].path),
    onViewProfileClick: () => navigate(buildPlayerHubPath()),
    onSettingsClick: () => navigate(buildPlayerHubPath()),
    onSecurityClick: () => navigate(buildPlayerHubPath()),
    onUpdatePhoto,
    getAvatars,
  });

  return {
    user,
    onLogout: logout,
    onLogin,
    getImageUrl,
    onUpdatePhoto,
    getAvatars,
    rightConfig,
    onAdminDashboardClick: () => navigate(ROUTE_FEATURES[RouteFeature.Admin].path),
  };
}
