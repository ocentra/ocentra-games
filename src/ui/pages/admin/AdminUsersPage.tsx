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
  isRouteEnabled,
  PlatformShell,
  ROUTE_FEATURES,
  RouteFeature,
} from '@/config/platformFeatures';
import { DynamicBackground, type RotationControlAPI } from '@/ui/components/Background/DynamicBackground';
import LoginDialog from '@/ui/components/Auth/LoginDialog';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuthHandlers } from '@/hooks/useAuthHandlers';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  AdminActivityAction,
  KeyboardKey,
} from '@/constants/admin';
import { requestJson } from '@ocentra/api-domain/httpClient';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import './AdminUsersPage.css';

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

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  photoURL?: string;
  lastLogin?: number;
}

interface AdminActivity {
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
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

  const handleToggleAdmin = useCallback((targetUser: UserData) => {
    setSelectedUser(targetUser);
    setPendingAction(targetUser.isAdmin ? AdminActivityAction.Revoke : AdminActivityAction.Grant);
    setShowConfirmDialog(true);
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

      setShowConfirmDialog(false);
      setSelectedUser(null);
      setPendingAction(null);
    } catch (error) {
      logError('Failed to toggle admin status', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update admin status. Please try again.';
      alert(errorMessage);
    }
  }, [selectedUser, pendingAction, loadAdminDashboardData]);

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="admin-users-main">
        <div className="admin-users-content">
          {permissionDenied && (
            <div className="cp-error">
              Admin user list is unavailable in this runtime due to Firebase permissions.
            </div>
          )}
          {/* Search Section */}
          <div className="admin-search-section">
            <div className="admin-search-container">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="search-clear-button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{users.length}</div>
                <div className="stat-label">Total Users</div>
              </div>
            </div>
            <div className="admin-stat-card admin-stat-card--highlight">
              <div className="stat-icon">👑</div>
              <div className="stat-content">
                <div className="stat-value">
                  {users.filter(u => u.isAdmin).length}
                </div>
                <div className="stat-label">Administrators</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <div className="stat-value">{activities.length}</div>
                <div className="stat-label">Recent Actions</div>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">
                <span className="section-icon">👥</span>
                Users
                {searchQuery && (
                  <span className="search-results-count">
                    ({filteredUsers.length} results)
                  </span>
                )}
              </h2>
              <button
                className="admin-action-button admin-action-button--refresh"
                onClick={loadAdminDashboardData}
                disabled={loading}
                title="Refresh users"
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading users...</div>
              </div>
            ) : (
              <div className="admin-users-table-container">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="no-results">
                          {searchQuery
                            ? 'No users found matching your search'
                            : 'No users available'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(userData => (
                        <tr key={userData.uid} className="user-row">
                          <td>
                            <div className="user-info">
                              <div className="user-avatar">
                                {userData.photoURL ? (
                                  <img
                                    src={userData.photoURL}
                                    alt={userData.displayName}
                                  />
                                ) : (
                                  <div className="user-avatar-placeholder">
                                    {userData.displayName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="user-details">
                                <div className="user-name">
                                  {userData.displayName}
                                </div>
                                <div className="user-uid">{userData.uid}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="user-email">{userData.email}</div>
                          </td>
                          <td>
                            <div
                              className={`user-status-badge ${
                                userData.isAdmin
                                  ? 'user-status-badge--admin'
                                  : 'user-status-badge--user'
                              }`}
                            >
                              {userData.isAdmin ? (
                                <>
                                  <span className="status-icon">👑</span>
                                  Admin
                                </>
                              ) : (
                                <>
                                  <span className="status-icon">👤</span>
                                  User
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="user-last-login">
                              {userData.lastLogin
                                ? new Date(
                                    userData.lastLogin
                                  ).toLocaleString()
                                : 'Never'}
                            </div>
                          </td>
                          <td>
                            <button
                              className={`admin-toggle-button ${
                                userData.isAdmin
                                  ? 'admin-toggle-button--revoke'
                                  : 'admin-toggle-button--grant'
                              }`}
                              onClick={() => handleToggleAdmin(userData)}
                              disabled={userData.uid === user?.uid}
                              title={
                                userData.uid === user?.uid
                                  ? 'Cannot modify your own admin status'
                                  : userData.isAdmin
                                  ? 'Revoke admin privileges'
                                  : 'Grant admin privileges'
                              }
                            >
                              {userData.isAdmin ? '➖ Revoke' : '➕ Grant'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">
                <span className="section-icon">📝</span>
                Activity Log
              </h2>
            </div>

            {activities.length === 0 ? (
              <div className="admin-empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">
                  No activity recorded yet
                </div>
              </div>
            ) : (
              <div className="admin-activity-list">
                {activities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      {activity.action === AdminActivityAction.Grant ? '➕' : '➖'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">
                        <strong>{activity.adminEmail}</strong>
                        {activity.action === AdminActivityAction.Grant
                          ? ' granted admin privileges to '
                          : ' revoked admin privileges from '}
                        <strong>{activity.targetEmail}</strong>
                      </div>
                      <div className="activity-timestamp">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedUser && (
        <>
          <div
            className="admin-dialog-overlay"
            onClick={() => setShowConfirmDialog(false)}
            onKeyDown={(e) => e.key === KeyboardKey.Escape && setShowConfirmDialog(false)}
            role="button"
            tabIndex={0}
            aria-label="Close dialog"
          />
          <div className="admin-dialog">
            <div className="admin-dialog-header">
              <h3>
                {pendingAction === AdminActivityAction.Grant
                  ? '➕ Grant Admin Privileges'
                  : '➖ Revoke Admin Privileges'}
              </h3>
            </div>
            <div className="admin-dialog-content">
              <p>
                Are you sure you want to{' '}
                <strong>
                  {pendingAction === AdminActivityAction.Grant ? AdminActivityAction.Grant : AdminActivityAction.Revoke}
                </strong>{' '}
                admin privileges {pendingAction === AdminActivityAction.Grant ? 'to' : 'from'}:
              </p>
              <div className="confirm-user-info">
                <div className="confirm-user-name">
                  {selectedUser.displayName}
                </div>
                <div className="confirm-user-email">{selectedUser.email}</div>
              </div>
              <div className="admin-dialog-warning">
                ⚠️ This action will be logged and can be audited.
              </div>
            </div>
            <div className="admin-dialog-actions">
              <button
                className="admin-dialog-button admin-dialog-button--cancel"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSelectedUser(null);
                  setPendingAction(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`admin-dialog-button ${
                  pendingAction === AdminActivityAction.Grant
                    ? 'admin-dialog-button--confirm-grant'
                    : 'admin-dialog-button--confirm-revoke'
                }`}
                onClick={confirmToggleAdmin}
              >
                {pendingAction === AdminActivityAction.Grant
                  ? 'Grant Admin'
                  : 'Revoke Admin'}
              </button>
            </div>
          </div>
        </>
      )}
    </UnifiedPageShell>
  );
};

