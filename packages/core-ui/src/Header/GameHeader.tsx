import type { UserProfile } from '../types/userProfile';
import type { AvatarInfo } from '../types/avatarInfo';
import { HeaderHomeButton } from './HeaderHomeButton';
import { ProfileMenu } from './ProfileMenu';
import styles from './GameHeader.module.css';

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
  const profileMenu = (
    <ProfileMenu
      user={user}
      showProfile={showProfile}
      onLogout={onLogout}
      getImageUrl={getImageUrl}
      onUpdatePhoto={onUpdatePhoto}
      getAvatars={getAvatars}
      onAdminDashboardClick={onAdminDashboardClick}
    />
  );

  if (variant === 'welcome' && welcomeLogos) {
    return (
      <header className={styles.gameHeader}>
        <div className={styles.headerContainer} data-variant="welcome">
          <div className={styles.headerLogoUnit}>
            <img src={welcomeLogos.ocentraText} alt="Ocentra" className={styles.headerTextImage} />
            <div className={styles.headerLogoCircleWrapper}>
              <div className={styles.headerLogoCircle}>
                <img src={welcomeLogos.mlogo} alt="Ocentra AI" className={styles.headerLogoCircleImage} />
              </div>
            </div>
            <img src={welcomeLogos.gamesText} alt="Games" className={styles.headerTextImage} />
          </div>
          <div className={styles.headerRightWelcome} />
          {profileMenu}
        </div>
      </header>
    );
  }

  return (
    <header className={styles.gameHeader}>
      <div className={styles.headerContainer} data-variant="game">
        <div className={styles.headerLeft}>
          {onHomeClick && <HeaderHomeButton variant="game" onClick={onHomeClick} />}
        </div>
        <div className={styles.headerCenter}>
          <div className={styles.headerCenterContent}>
            <h1 className={styles.gameTitle}>
              <span className={styles.suitBlack}>♠</span>
              <span className={styles.suitRed}>♥</span>
              {` ${gameName} `}
              <span className={styles.suitRed}>♦</span>
              <span className={styles.suitBlack}>♣</span>
            </h1>
            {tagline && <p className={styles.headerTagline}>{tagline}</p>}
          </div>
        </div>
        <div className={styles.headerRight}>{profileMenu}</div>
      </div>
    </header>
  );
}
