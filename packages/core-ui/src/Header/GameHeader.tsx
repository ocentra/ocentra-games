import { useState } from 'react';
import type { UserProfile } from '../types/userProfile';
import type { AvatarInfo } from '../types/avatarInfo';
import { ProfilePictureModal } from './ProfilePictureModal';
import './GameHeader.css';

export interface WelcomeLogos {
  ocentraText: string;
  mlogo: string;
  gamesText: string;
}

export interface GameHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  showProfile?: boolean;
  variant?: 'welcome' | 'game';
  gameName?: string;
  onHomeClick?: () => void;
  tagline?: string;
  getImageUrl?: (url: string) => string;
  onUpdatePhoto?: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars?: () => Promise<AvatarInfo[]>;
  welcomeLogos?: WelcomeLogos;
  onAdminDashboardClick?: () => void;
}

export function GameHeader({
  user,
  onLogout,
  showProfile = true,
  variant = 'game',
  gameName = 'CLAIM',
  onHomeClick,
  tagline,
  getImageUrl = (url) => url,
  onUpdatePhoto,
  getAvatars = async () => [],
  welcomeLogos,
  onAdminDashboardClick,
}: GameHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);

  const profilePictureUrl = user?.photoURL ? getImageUrl(user.photoURL) : null;

  const handleImageError = () => {};

  const handleLogout = () => {
    setShowProfileMenu(false);
    onLogout?.();
  };

  const renderProfileSection = () => {
    if (!showProfile || !user) return null;
    const buttonContent = (
      <>
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
      </>
    );
    return (
      <div className="user-profile-section">
        {showProfileMenu ? (
          <button
            type="button"
            className="user-profile-compact"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile menu"
            aria-expanded="true"
          >
            {buttonContent}
          </button>
        ) : (
          <button
            type="button"
            className="user-profile-compact"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile menu"
            aria-expanded="false"
          >
            {buttonContent}
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
                    <img src={profilePictureUrl} alt={user.displayName} className="profile-menu-avatar" />
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
    );
  };

  if (variant === 'welcome' && welcomeLogos) {
    return (
      <header className="game-header game-header--welcome">
        <div className="header-container header-container--welcome">
          <div className="header-logo-unit">
            <img src={welcomeLogos.ocentraText} alt="Ocentra" className="header-text-image header-text-left" />
            <div className="header-logo-circle-wrapper">
              <div className="header-logo-circle">
                <img src={welcomeLogos.mlogo} alt="Ocentra AI" className="header-logo-circle-image" />
              </div>
            </div>
            <img src={welcomeLogos.gamesText} alt="Games" className="header-text-image header-text-right" />
          </div>
          <div className="header-right--welcome" />
          {renderProfileSection()}
        </div>
        {onUpdatePhoto && user && (
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

  return (
    <header className="game-header game-header--game">
      <div className="header-container">
        <div className="header-left">
          {onHomeClick && (
            <button
              className="header-home-button"
              onClick={onHomeClick}
              title="Home"
              aria-label="Home"
              type="button"
            >
              <span className="home-icon">🏠</span>
              <span className="home-text">Home</span>
            </button>
          )}
        </div>
        <div className="header-center">
          <div className="header-center-content">
            <h1 className="game-title">
              <span className="suit-black">♠</span>
              <span className="suit-red">♥</span>
              {` ${gameName} `}
              <span className="suit-red">♦</span>
              <span className="suit-black">♣</span>
            </h1>
            {tagline && <p className="header-tagline">{tagline}</p>}
          </div>
        </div>
        <div className="header-right">{renderProfileSection()}</div>
      </div>
      {onUpdatePhoto && user && (
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
