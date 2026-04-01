import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { ROUTE_FEATURES, RouteFeature } from '@/config/platformFeatures';
import { getProxiedImageUrl, shouldProxyImage } from '@utils/imageProxy';
import { AvatarAssetManager } from '@/lib/managers/resources/AvatarAssetManager';

export function useCoreUIHeaderProps() {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile } = useAuth();

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

  return {
    user,
    onLogout: logout,
    getImageUrl,
    onUpdatePhoto,
    getAvatars,
    onAdminDashboardClick: () => navigate(ROUTE_FEATURES[RouteFeature.Admin].path),
  };
}
