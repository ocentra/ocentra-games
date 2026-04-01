import { useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getProxiedImageUrl, shouldProxyImage } from '@utils/imageProxy';

export function useCoreUIHeaderProps() {
  const { user, logout } = useAuth();

  const getImageUrl = useCallback((url: string) => {
    return shouldProxyImage(url) ? getProxiedImageUrl(url) : url;
  }, []);

  return {
    user,
    onLogout: logout,
    getImageUrl,
  };
}
