import { useState } from 'react';
import type { AvatarInfo } from '../types/avatarInfo';
import type { UserProfile } from '../types/userProfile';
import { ProfilePictureModal } from './ProfilePictureModal';
import styles from './ProfileMenu.module.css';

export interface ProfileMenuProps {
  user: UserProfile | null;
  showProfile?: boolean;
  onLogout?: () => void;
  getImageUrl?: (url: string) => string;
  onUpdatePhoto?: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars?: () => Promise<AvatarInfo[]>;
  onAdminDashboardClick?: () => void;
}

export function ProfileMenu({
  user,
  showProfile = true,
  onLogout,
  getImageUrl = (url) => url,
  onUpdatePhoto,
  getAvatars = async () => [],
  onAdminDashboardClick,
}: ProfileMenuProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);

  if (!showProfile || !user) return null;

  const profilePictureUrl = user.photoURL && failedPhotoUrl !== user.photoURL ? getImageUrl(user.photoURL) : null;

  const handleImageError = () => {
    if (user.photoURL && failedPhotoUrl !== user.photoURL) {
      setFailedPhotoUrl(user.photoURL);
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    onLogout?.();
  };

  return (
    <div className={styles.userProfileSection}>
      <button
        type="button"
        className={styles.userProfileCompact}
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        aria-label="User profile menu"
        aria-expanded={showProfileMenu}
        aria-haspopup="menu"
      >
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt={user.displayName}
            className={styles.profileAvatarCompact}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.profileAvatarPlaceholderCompact}>
            {user.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <span className={styles.profileNameCompact}>{user.displayName || 'Player'}</span>
        {user.isAdmin && (
          <span className={styles.adminBadge} title="Administrator">
            👑
          </span>
        )}
        <span className={styles.profileArrow}>▼</span>
      </button>

      {showProfileMenu && (
        <>
          <button
            type="button"
            className={styles.profileMenuBackdrop}
            onClick={() => setShowProfileMenu(false)}
            aria-label="Close profile menu"
          />
          <div className={styles.profileMenuCompact} role="menu">
            <div className={styles.profileMenuHeader}>
              <button
                type="button"
                className={styles.profilePictureWrapper}
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
                    className={styles.profileMenuAvatar}
                    onError={handleImageError}
                  />
                ) : (
                  <div className={styles.profileMenuAvatarPlaceholder}>
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className={styles.editOverlay}>
                  <span>✏️</span>
                </div>
              </button>
              <div className={styles.profileMenuInfo}>
                <div className={styles.profileMenuName}>{user.displayName}</div>
                <div className={styles.profileMenuEmail}>{user.email}</div>
              </div>
            </div>

            <div className={styles.profileMenuDivider} />

            <div className={styles.profileStats}>
              <div className={styles.profileStat}>
                <span className={styles.statLabel}>ELO</span>
                <span className={styles.statValue}>{user.eloRating ?? 1200}</span>
              </div>
              <div className={styles.profileStat}>
                <span className={styles.statLabel}>Games</span>
                <span className={styles.statValue}>{user.gamesPlayed ?? 0}</span>
              </div>
              <div className={styles.profileStat}>
                <span className={styles.statLabel}>Win Rate</span>
                <span className={styles.statValue}>{user.winRate?.toFixed(1) ?? '0'}%</span>
              </div>
            </div>

            <div className={styles.profileMenuDivider} />

            {user.isAdmin && onAdminDashboardClick && (
              <>
                <button type="button" className={styles.profileMenuLink} onClick={onAdminDashboardClick}>
                  <span className={styles.menuLinkIcon}>👑</span>
                  <span className={styles.menuLinkText}>Admin Dashboard</span>
                </button>
                <div className={styles.profileMenuDivider} />
              </>
            )}

            <button type="button" className={styles.profileLogoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </>
      )}

      {showPictureModal && onUpdatePhoto && user && (
        <ProfilePictureModal
          isOpen={showPictureModal}
          onClose={() => setShowPictureModal(false)}
          user={user}
          onUpdatePhoto={onUpdatePhoto}
          getAvatars={getAvatars}
        />
      )}
    </div>
  );
}
