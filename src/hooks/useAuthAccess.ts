import { useCallback } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { useAuth } from '@/providers/AuthProvider';

type AuthenticatedAction<T> = (user: UserProfile) => Promise<T> | T;

export function useAuthAccess() {
  const { requireSession, requireAccount, requireAdmin } = useAuth();

  const runWithSession = useCallback(async <T>(action: AuthenticatedAction<T>): Promise<T | null> => {
    const user = await requireSession();
    if (!user) {
      return null;
    }
    return action(user);
  }, [requireSession]);

  const runWithAccount = useCallback(async <T>(action: AuthenticatedAction<T>): Promise<T | null> => {
    const user = await requireAccount();
    if (!user) {
      return null;
    }
    return action(user);
  }, [requireAccount]);

  const runWithAdmin = useCallback(async <T>(action: AuthenticatedAction<T>): Promise<T | null> => {
    const user = await requireAdmin();
    if (!user) {
      return null;
    }
    return action(user);
  }, [requireAdmin]);

  return {
    requireSession,
    requireAccount,
    requireAdmin,
    runWithSession,
    runWithAccount,
    runWithAdmin,
  };
}
