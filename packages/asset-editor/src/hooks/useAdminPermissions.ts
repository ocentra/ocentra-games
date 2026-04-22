import { useAuth } from '@/hooks/useAuth';

export interface AdminPermissions {
  isAdmin: boolean;
  canEdit: boolean;
  canView: boolean;
}

export function useAdminPermissions(): AdminPermissions {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;

  return {
    isAdmin,
    canEdit: isAdmin,
    canView: isAdmin,
  };
}

