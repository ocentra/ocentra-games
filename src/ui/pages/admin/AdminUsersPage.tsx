import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildHomePath } from '@/ui/navigation/appRoutes';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { APP_VERSION } from '@/constants/version';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';
import {
  AdminUsersPageContent,
  type AdminActivityRow,
  type AdminUserRow,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import {
  isRouteEnabled,
  PlatformShell,
  ROUTE_FEATURES,
  RouteFeature,
} from '@/config/platformFeatures';
import { DynamicBackground, type RotationControlAPI } from '@ocentra/core-ui/Background/DynamicBackground';
import LoginDialog from '@/ui/components/Auth/LoginDialog';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuthHandlers } from '@/hooks/useAuthHandlers';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AdminActivityAction } from '@/constants/admin';
import { requestJson } from '@ocentra/api-domain/httpClient';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

const log = MainAppLogger.instance;
log.register(import.meta.url);
const ADMIN_AUTH_TRACE_STORAGE_KEY = 'ocentra:debug:admin-auth';
const ADMIN_AUTH_TRACE_GLOBAL_KEY = '__OCENTRA_ADMIN_AUTH_TRACE';

const logInfo = (message: string, data?: unknown) => {
  log.logInfo(`[AdminUsersPage] ${message}`, getStackTrace(), data);
};

const logError = (message: string, error?: unknown) => {
  log.logError(`[AdminUsersPage] ${message}`, getStackTrace(), error);
};

const logWarn = (message: string, data?: unknown) => {
  log.logWarn(`[AdminUsersPage] ${message}`, getStackTrace(), data);
};

function isAdminAuthTraceEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return window.localStorage.getItem(ADMIN_AUTH_TRACE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function syncAdminAuthTraceFlag(): boolean {
  const enabled = isAdminAuthTraceEnabled();
  (globalThis as Record<string, unknown>)[ADMIN_AUTH_TRACE_GLOBAL_KEY] = enabled;
  return enabled;
}

interface UserData extends AdminUserRow {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  photoURL?: string;
  lastLogin?: number;
}

interface AdminActivity extends AdminActivityRow {
  timestamp: number;
  adminEmail: string;
  action: AdminActivityAction;
  targetEmail: string;
  targetUid: string;
}

export const AdminUsersPage: React.FC = () => {
  const headerProps = useCoreUIHeaderProps();
  const {
    user,
    logout,
    login,
    signUp,
    loginWithFacebook,
    loginWithGoogle,
    loginAsGuest,
    sendPasswordReset,
  } = useAuth();
  const { isAdmin } = useAdminPermissions();
  const { shell } = usePlatformUI();
  const navigate = useNavigate();
  const rotationRef = useRef<RotationControlAPI | null>(null);
  const platform = shell as PlatformShell;
  const isDev = import.meta.env.DEV;
  const handleWalletLogin = useCallback(async (): Promise<{ success: boolean; error?: string }> => ({
    success: false,
    error: 'Please connect your wallet in the login dialog',
  }), []);
  const authHandlers = useAuthHandlers(
    login,
    signUp,
    loginWithFacebook,
    loginWithGoogle,
    loginAsGuest,
    handleWalletLogin
  );

  const [users, setUsers] = useState<UserData[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [pendingAction, setPendingAction] = useState<AdminActivityAction | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const hideLoading = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hideLoading?.();
  }, []);

  const loadAdminDashboardData = useCallback(async () => {
    const authTraceEnabled = syncAdminAuthTraceFlag();
    log.logInfo(
      '[AdminUsersPage] [AdminAuthFlow:A] admin dashboard fetch requested',
      getStackTrace(),
      {
        authTraceEnabled,
        isAdmin,
        hasUser: Boolean(user?.uid),
      },
      authTraceEnabled
    );
    setLoading(true);
    setPermissionDenied(false);
    try {
      const result = await requestJson<{ users?: UserData[]; activity?: AdminActivity[] }>(
        ApiEndpoint.Admin.DashboardData,
        { authMode: 'required' }
      );
      const usersData = result.users ?? [];
      const activitiesData = result.activity ?? [];

      setUsers(usersData);
      setActivities(activitiesData);
      logInfo('Users loaded', { count: usersData.length });
      logInfo('Activity log loaded', { count: activitiesData.length });
    } catch (error: unknown) {
      const errorCode = (error as { code?: string } | null)?.code;
      const errorStatus = (error as { status?: number } | null)?.status;
      if (errorCode === 'permission-denied' || errorStatus === 401 || errorStatus === 403) {
        setPermissionDenied(true);
        logWarn('Insufficient permissions to load users', { code: errorCode, status: errorStatus });
      } else {
        logError('Failed to load admin dashboard data', error);
      }
      setUsers([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (!isAdmin || hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    loadAdminDashboardData();
  }, [isAdmin, loadAdminDashboardData]);

  const handleToggleAdmin = useCallback((targetUser: AdminUserRow) => {
    setSelectedUser(targetUser);
    setPendingAction(targetUser.isAdmin ? AdminActivityAction.Revoke : AdminActivityAction.Grant);
  }, []);

  const confirmToggleAdmin = useCallback(async () => {
    if (!selectedUser || !pendingAction) return;

    try {
      logInfo('Toggling admin status', {
        targetEmail: selectedUser.email,
        action: pendingAction,
      });

      const result = await requestJson<{ success?: boolean }, { isAdmin: boolean }>(
        ApiEndpoint.Admin.UserStatus(selectedUser.uid),
        {
          method: 'POST',
          body: { isAdmin: pendingAction === AdminActivityAction.Grant },
          authMode: 'required',
        }
      );

      if (!result.success) {
        throw new Error('Failed to update admin status');
      }

      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.uid === selectedUser.uid
            ? { ...u, isAdmin: pendingAction === AdminActivityAction.Grant }
            : u
        )
      );

      await loadAdminDashboardData();

      setSelectedUser(null);
      setPendingAction(null);
    } catch (error) {
      logError('Failed to toggle admin status', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update admin status. Please try again.';
      alert(errorMessage);
    }
  }, [selectedUser, pendingAction, loadAdminDashboardData]);

  const primaryNavigationItems = useMemo(() => {
    const items: Array<{ label: string; path: string }> = [];
    if (isRouteEnabled(RouteFeature.Logs, platform, isDev)) {
      items.push({ label: 'Logs Viewer', path: ROUTE_FEATURES[RouteFeature.Logs].path });
    }
    if (isRouteEnabled(RouteFeature.AIPlayground, platform, isDev)) {
      items.push({ label: 'AI Playground', path: ROUTE_FEATURES[RouteFeature.AIPlayground].path });
    }
    if (isRouteEnabled(RouteFeature.CardGamesExplorer, platform, isDev)) {
      items.push({ label: 'Card Games Explorer', path: ROUTE_FEATURES[RouteFeature.CardGamesExplorer].path });
    }
    return items;
  }, [platform, isDev]);

  if (!isAdmin) {
    return (
      <LoginDialog
        onLogin={authHandlers.login}
        onFacebookLogin={authHandlers.facebookLogin}
        onGoogleLogin={authHandlers.googleLogin}
        onGuestLogin={authHandlers.guestLogin}
        onWalletLogin={authHandlers.walletLogin}
        onSendPasswordReset={sendPasswordReset}
        adminRequired
        disableGuestLogin
        initialMode="signin"
        contextEyebrow="Admin Dashboard"
        contextTitle={user?.isGuest ? 'Upgrade from guest to administrator access' : 'Administrator access required'}
        contextDescription={
          user?.email
            ? `Signed in as ${user.email}, but this dashboard is limited to approved administrator accounts.`
            : 'This dashboard manages player accounts and platform permissions, so it is limited to approved administrator accounts.'
        }
        onClose={() => navigate(buildHomePath())}
      />
    );
  }

  const headerTagline = 'Control Center | Manage users and system tools';

  return (
    <UnifiedPageShell
      className="admin-users-page"
      workClassName="admin-users-work"
      background={
        <DynamicBackground
          controlRef={rotationRef}
          onReady={() => {}}
        />
      }
      header={
        <UnifiedHeader
          profileName="main_screen"
          includeAdminNavigation={Boolean(user?.isAdmin)}
          primaryNavigationItems={primaryNavigationItems}
          dynamicData={{
            gameName: 'Admin Dashboard',
            tagline: headerTagline,
          }}
          config={{
            left: {
              onClick: () => navigate(buildHomePath()),
            },
            right: user
              ? {
                  isProfile: true,
                  user: {
                    uid: user.uid,
                    name: user.displayName || 'Player',
                    email: user.email ?? '',
                    avatarUrl: user.photoURL ? headerProps.getImageUrl(user.photoURL) : undefined,
                    isLoggedIn: true,
                    isGuest: user.isGuest,
                    isAdmin: user.isAdmin,
                  },
                  onLogout: logout,
                  onAdminDashboardClick: () => navigate(ROUTE_FEATURES[RouteFeature.Admin].path),
                  onUpdatePhoto: headerProps.onUpdatePhoto,
                  getAvatars: headerProps.getAvatars,
                }
              : undefined,
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <AdminUsersPageContent
        permissionDenied={permissionDenied}
        users={users}
        activities={activities}
        loading={loading}
        searchQuery={searchQuery}
        selectedUser={selectedUser}
        pendingAction={pendingAction}
        onSearchChange={setSearchQuery}
        onRefresh={loadAdminDashboardData}
        onToggleAdmin={handleToggleAdmin}
        onCancelDialog={() => {
          setSelectedUser(null);
          setPendingAction(null);
        }}
        onConfirmDialog={confirmToggleAdmin}
        currentUserId={user?.uid}
      />
    </UnifiedPageShell>
  );
};

