import { useState, type ReactNode } from 'react';
import type { UserProfile } from '../types/userProfile';
import type { AvatarInfo } from '../types/avatarInfo';
import { ProfilePictureModal } from './ProfilePictureModal';
import './BaseHeader.css';

export interface BaseHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  showProfile?: boolean;
  leftContent?: ReactNode;
  centerContent: ReactNode;
  rightContent?: ReactNode;
  rightExtraContent?: ReactNode;
  rightSuffixContent?: ReactNode;
  titleBarDragRegion?: boolean;
  className?: string;
  getImageUrl?: (url: string) => string;
  onUpdatePhoto?: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars?: () => Promise<AvatarInfo[]>;
  onAdminDashboardClick?: () => void;
}

export function BaseHeader({
  user,
  onLogout,
  showProfile = true,
  leftContent,
  centerContent,
  rightContent,
  rightExtraContent,
  rightSuffixContent,
  titleBarDragRegion = false,
  className = '',
  getImageUrl = (url) => url,
  onUpdatePhoto,
  getAvatars = async () => [],
  onAdminDashboardClick,
}: BaseHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const profilePictureUrl = user?.photoURL ? getImageUrl(user.photoURL) : null;

  const handleImageError = () => {
    if (!imageError) setImageError(true);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    onLogout?.();
  };

  const profileSection =
    showProfile && user ? (
      <div className="user-profile-section">
        {showProfileMenu ? (
          <button
            type="button"
            className="user-profile-compact"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile menu"
            aria-expanded="true"
          >
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt={user.displayName}
                className="profile-avatar-compact"
                onError={handleImageError}
              />
            ) : (
              <div className="profile-avatar-placeholder-compact">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="profile-name-compact">{user.displayName || 'Player'}</span>
            {user.isAdmin && (
              <span className="admin-badge" title="Administrator">
                👑
              </span>
            )}
            <span className="profile-arrow">▼</span>
          </button>
        ) : (
          <button
            type="button"
            className="user-profile-compact"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile menu"
            aria-expanded="false"
          >
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt={user.displayName}
                className="profile-avatar-compact"
                onError={handleImageError}
              />
            ) : (
              <div className="profile-avatar-placeholder-compact">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="profile-name-compact">{user.displayName || 'Player'}</span>
            {user.isAdmin && (
              <span className="admin-badge" title="Administrator">
                👑
              </span>
            )}
            <span className="profile-arrow">▼</span>
          </button>
        )}

        {showProfileMenu && (
          <>
            <button
              type="button"
              className="profile-menu-backdrop"
              onClick={() => setShowProfileMenu(false)}
              aria-label="Close profile menu"
            />
            <div className="profile-menu-compact">
              <div className="profile-menu-header">
                <button
                  type="button"
                  className="profile-picture-wrapper"
                  onClick={() => {
                    setShowPictureModal(true);
                    setShowProfileMenu(false);
                  }}
                  aria-label="Change profile picture"
                >
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt={user.displayName}
                      className="profile-menu-avatar"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="profile-menu-avatar-placeholder">
                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="edit-overlay">
                    <span>✏️</span>
                  </div>
                </button>
                <div className="profile-menu-info">
                  <div className="profile-menu-name">{user.displayName}</div>
                  <div className="profile-menu-email">{user.email}</div>
                </div>
              </div>

              <div className="profile-menu-divider" />

              <div className="profile-stats">
                <div className="profile-stat">
                  <span className="stat-label">ELO</span>
                  <span className="stat-value">{user.eloRating ?? 1200}</span>
                </div>
                <div className="profile-stat">
                  <span className="stat-label">Games</span>
                  <span className="stat-value">{user.gamesPlayed ?? 0}</span>
                </div>
                <div className="profile-stat">
                  <span className="stat-label">Win Rate</span>
                  <span className="stat-value">{user.winRate?.toFixed(1) ?? '0'}%</span>
                </div>
              </div>

              <div className="profile-menu-divider" />

              {user.isAdmin && onAdminDashboardClick && (
                <>
                  <button type="button" className="profile-menu-link" onClick={onAdminDashboardClick}>
                    <span className="menu-link-icon">👑</span>
                    <span className="menu-link-text">Admin Dashboard</span>
                  </button>
                  <div className="profile-menu-divider" />
                </>
              )}

              <button className="profile-logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    ) : null;

  const canShowProfileModal = onUpdatePhoto && getAvatars;

  return (
    <header className={`base-header ${className}`}>
      <div className="base-header-container">
        <div className="base-header-left" {...(titleBarDragRegion ? { 'data-tauri-drag-region': '' } : {})}>{leftContent}</div>
        <div className="base-header-center" {...(titleBarDragRegion ? { 'data-tauri-drag-region': '' } : {})}>
          <div className="base-header-center-content">{centerContent}</div>
        </div>
        <div className="base-header-right">
          <div className="base-header-right-drag" {...(titleBarDragRegion ? { 'data-tauri-drag-region': '' } : {})}>{rightExtraContent}{rightContent ?? profileSection}</div>
          {rightSuffixContent}
        </div>
      </div>

      {canShowProfileModal && user && (
        <ProfilePictureModal
          isOpen={showPictureModal}
          onClose={() => setShowPictureModal(false)}
          user={user}
          onUpdatePhoto={onUpdatePhoto}
          getAvatars={getAvatars}
        />
      )}
    </header>
  );
}
