import { useState } from 'react';
import type { UserProfile } from '@services';
import { ProfilePictureModal } from './ProfilePictureModal';
import './GameHeader.css';

interface GameHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  showProfile?: boolean;
}

export function GameHeader({ user, onLogout, showProfile = true }: GameHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);

  const handleLogout = () => {
    setShowProfileMenu(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="game-header">
      {/* Parent div - fully transparent */}
      <div className="header-container">
        {/* Left child - half of parent, semi-transparent */}
        <div className="header-left">
        </div>

        {/* Center child - just a border */}
        <div className="header-center">
          <h1 className="game-title">
            <span className="suit-black">♠</span>
            <span className="suit-red">♥</span>
            {' CLAIM '}
            <span className="suit-red">♦</span>
            <span className="suit-black">♣</span>
          </h1>
        </div>

        {/* Right child - half of parent, semi-transparent */}
        <div className="header-right">
          {showProfile && user && (
            <div className="user-profile-section">
              <button
                type="button"
                className="user-profile-compact"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label="User profile menu"
                aria-expanded={showProfileMenu}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="profile-avatar-compact" />
                ) : (
                  <div className="profile-avatar-placeholder-compact">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="profile-name-compact">{user.displayName || 'Player'}</span>
                <span className="profile-arrow">▼</span>
              </button>

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
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="profile-menu-avatar" />
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
                    
                    <div className="profile-menu-divider"></div>
                    
                    <div className="profile-stats">
                      <div className="profile-stat">
                        <span className="stat-label">ELO</span>
                        <span className="stat-value">{user.eloRating || 1200}</span>
                      </div>
                      <div className="profile-stat">
                        <span className="stat-label">Games</span>
                        <span className="stat-value">{user.gamesPlayed || 0}</span>
                      </div>
                      <div className="profile-stat">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">{user.winRate?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                    
                    <div className="profile-menu-divider"></div>
                    
                    <button className="profile-logout-button" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      <ProfilePictureModal 
        isOpen={showPictureModal}
        onClose={() => setShowPictureModal(false)}
      />
    </header>
  );
}

